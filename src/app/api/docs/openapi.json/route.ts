import { defineRoute } from '@/lib/framework/define-route';
import { generateOpenAPISpec } from '@/lib/openapi';

export const dynamic = 'force-dynamic';

export const GET = defineRoute({
  auth: 'none',
  async handler() {
    const spec = generateOpenAPISpec();
    return Response.json(spec, {
      headers: { 'Cache-Control': 'public, max-age=3600' },
    });
  },
});
