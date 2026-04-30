export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { success, errors, getRequestId } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';

interface CheckUsernameResponse {
  taken: boolean;
  username: string;
}

// GET /api/v1/users/check-username?username=xxx
export async function GET(req: NextRequest) {
  const requestId = getRequestId(req);
  const username = req.nextUrl.searchParams.get('username');

  if (!username || username.length < 1 || username.length > 39) {
    return errors.badRequest('用户名长度需在 1-39 位之间', requestId);
  }

  const existing = await prisma.user.findFirst({
    where: { username },
    select: { id: true },
  });

  const response: CheckUsernameResponse = {
    taken: !!existing,
    username,
  };

  return success(response, '查询成功');
}
