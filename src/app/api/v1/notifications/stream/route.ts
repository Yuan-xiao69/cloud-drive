import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { notificationEmitter } from '@/lib/notification-service';

/**
 * SSE 实时通知流
 * GET /api/v1/notifications/stream
 *
 * 建立 Server-Sent Events 长连接，当后台推送通知时实时下发给客户端。
 * 支持 heartbeat（每 25 秒）防止连接超时。
 */
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return new Response(
      JSON.stringify({ code: 401, message: '未登录或 Token 已过期', data: null }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { userId } = user;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      function send(data: string) {
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          // 连接已关闭，忽略
        }
      }

      // 发送连接确认事件
      send(`event: connected\ndata: ${JSON.stringify({ userId })}\n\n`);

      // 通知处理器
      function handleNotification(payload: unknown) {
        send(`event: notification\ndata: ${JSON.stringify(payload)}\n\n`);
      }

      // 订阅该用户的通知事件
      const eventName = `notification:${userId}`;
      notificationEmitter.on(eventName, handleNotification);

      // 心跳定时器（每 25 秒发一次，防止反向代理/CDN 超时断开）
      const heartbeatTimer = setInterval(() => {
        send(`: heartbeat\n\n`);
      }, 25000);

      // 监听请求关闭
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatTimer);
        notificationEmitter.off(eventName, handleNotification);
        try {
          controller.close();
        } catch {
          // 已关闭，忽略
        }
      });
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // 禁止 nginx 缓冲
    },
  });
}
