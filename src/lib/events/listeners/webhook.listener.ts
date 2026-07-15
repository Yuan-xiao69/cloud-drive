/**
 * Webhook 投递监听器 — 处理 fire_webhook 异步任务
 *
 * 根据事件类型和仓库 ID 匹配已配置的 Webhook 端点，
 * 将事件数据 HTTP POST 到每个匹配的端点，并记录投递结果。
 *
 * 关键设计：
 * - 每个 Webhook 独立投递，单个失败不影响其他
 * - 10 秒超时，防止慢端点阻塞队列
 * - 投递结果记录到 WebhookDelivery 表用于审计
 */

import { prisma } from '@/lib/prisma'

/** Webhook 投递任务负载类型 */
interface FireWebhookPayload {
  /** 事件类型，如 push、issues、pull_request、discussion 等 */
  event: string
  /** 关联仓库 ID（可选，为空表示匹配全局 webhook） */
  repoId?: string
  /** 发送的数据负载 */
  data: Record<string, unknown>
}

/**
 * 处理 Webhook 投递任务。
 * 匹配规则：webhook.events 包含当前事件类型，且 webhook.repoId 匹配或为全局（null）。
 *
 * 不抛出错误——所有异常内部捕获并记录日志。
 */
export async function handleFireWebhook(
  payload: Record<string, unknown>,
): Promise<void> {
  // 解析参数
  const event = (payload.event as string) || ''
  const repoId = payload.repoId as string | undefined
  const data = (payload.data as Record<string, unknown>) || {}

  if (!event) {
    console.warn('[Webhook Listener] 缺少必填字段 event，跳过')
    return
  }

  // 查询匹配的 Webhook 配置
  // 条件：isActive=true，events 包含当前事件类型，repoId 匹配或全局
  let webhooks
  try {
    webhooks = await prisma.webhook.findMany({
      where: {
        isActive: true,
        events: { has: event },
        OR: [
          { repoId: repoId || undefined },
          { repoId: null }, // 全局 webhook 匹配所有仓库
        ],
      },
    })
  } catch (err) {
    console.error('[Webhook Listener] 查询 Webhook 配置失败:', {
      event,
      repoId,
      error: err instanceof Error ? err.message : String(err),
    })
    return
  }

  if (webhooks.length === 0) {
    // 没有匹配的 Webhook，正常结束
    return
  }

  // 投递到每个匹配的 Webhook
  const payloadJson = JSON.stringify(data)

  for (const webhook of webhooks) {
    const startedAt = Date.now()

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10_000) // 10 秒超时

      let response: Response
      try {
        response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': webhook.contentType === 'json'
              ? 'application/json'
              : 'application/x-www-form-urlencoded',
            'X-Event-Type': event,
            'X-Webhook-ID': webhook.id,
            ...(webhook.secret
              ? { 'X-Hub-Signature-256': computeSignature(webhook.secret, payloadJson) }
              : {}),
          },
          body: payloadJson,
          signal: controller.signal,
        })
      } finally {
        clearTimeout(timeoutId)
      }

      const duration = Date.now() - startedAt
      const statusCode = response.status
      const success = response.ok

      // 读取响应体（限制最大 4096 字符）
      let responseBody = ''
      try {
        responseBody = (await response.text()).slice(0, 4096)
      } catch {
        responseBody = '[无法读取响应体]'
      }

      // 记录投递结果
      await prisma.webhookDelivery.create({
        data: {
          webhookId: webhook.id,
          event,
          payload: payloadJson.slice(0, 65535), // 截断超长 payload
          response: responseBody,
          statusCode,
          duration,
          success,
          error: success ? null : `HTTP ${statusCode}: ${responseBody.slice(0, 200)}`,
        },
      })

      // 更新 Webhook 最后触发时间和状态
      await prisma.webhook.update({
        where: { id: webhook.id },
        data: {
          lastTriggeredAt: new Date(),
          lastStatus: statusCode,
        },
      })
    } catch (err) {
      const duration = Date.now() - startedAt
      const errorMsg = err instanceof Error ? err.message : String(err)

      // 判断是否为超时（Node.js 中 AbortError name 为 'AbortError'）
      const isTimeout = (err as { name?: string }).name === 'AbortError'
        || errorMsg.includes('abort')
        || errorMsg.includes('timeout')

      // 记录失败投递
      try {
        await prisma.webhookDelivery.create({
          data: {
            webhookId: webhook.id,
            event,
            payload: payloadJson.slice(0, 65535),
            response: null,
            statusCode: null,
            duration,
            success: false,
            error: isTimeout ? '请求超时（10秒）' : errorMsg.slice(0, 1000),
          },
        })

        await prisma.webhook.update({
          where: { id: webhook.id },
          data: {
            lastTriggeredAt: new Date(),
            lastStatus: 0,
          },
        })
      } catch (dbErr) {
        console.error('[Webhook Listener] 记录投递失败日志时出错:', dbErr)
      }

      console.error(`[Webhook Listener] Webhook 投递失败 [${webhook.name}]:`, {
        url: webhook.url,
        event,
        error: errorMsg,
      })
    }
  }
}

/**
 * 计算 HMAC-SHA256 签名（用于 Webhook 安全验证）。
 * 使用 Node.js 内置 crypto 模块。
 */
function computeSignature(secret: string, payload: string): string {
  const crypto = require('crypto')
  return `sha256=${crypto.createHmac('sha256', secret).update(payload).digest('hex')}`
}
