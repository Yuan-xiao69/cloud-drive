export const dynamic = 'force-dynamic';
import { defineRoute } from '@/lib/framework/define-route';
import { success, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';

// GET /api/v1/users/check-username?username=xxx
export const GET = defineRoute({
  auth: 'none',
  async handler({ req }) {
    const username = req.nextUrl.searchParams.get('username');

    if (!username || username.length < 3 || username.length > 20) {
      return errors.badRequest('用户名长度需在 3-20 位之间');
    }

    const existing = await prisma.user.findFirst({
      where: { username },
      select: { id: true },
    });

    return success({
      taken: !!existing,
      username,
    }, '查询成功');
  },
});
