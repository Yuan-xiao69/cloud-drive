/**
 * OpenAPI JSON 规范端点
 * GET /api/docs/openapi.json
 */

import { generateOpenAPISpec } from '@/lib/openapi';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const spec = generateOpenAPISpec();

  return Response.json(spec, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
