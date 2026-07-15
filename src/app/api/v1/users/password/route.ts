export const dynamic = 'force-dynamic';
/**
 * v1 用户密码修改 API
 * PUT /api/v1/users/password - 修改当前用户密码
 */

import { z } from 'zod';
import { defineRoute } from '@/lib/framework/define-route';
import { success, errors } from '@/lib/api/v1';
import { UserService } from '@/services/user-service';
import { validateSensitiveOperation } from '@/lib/csrf';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, '请提供当前密码'),
  newPassword: z.string().min(1, '请提供新密码'),
});

// PUT /api/v1/users/password
export const PUT = defineRoute({
  auth: 'required',
  rateLimit: 'auth',
  validation: changePasswordSchema,
  async handler({ user, body, req }) {
    const { currentPassword, newPassword } = body;

    // 验证敏感操作（密码验证 + CSRF 由管道处理）
    const validation = await validateSensitiveOperation(req, 'changePassword', {
      password: currentPassword,
    });

    if (!validation.valid) {
      return errors.forbidden(validation.error || '操作验证失败');
    }

    const result = await UserService.changePassword(
      user!.id,
      currentPassword,
      newPassword,
    );

    return success(result, '密码修改成功');
  },
});
