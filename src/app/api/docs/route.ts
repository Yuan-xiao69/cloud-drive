import { defineRoute } from '@/lib/framework/define-route';
import { generateOpenAPISpec } from '@/lib/openapi';

export const dynamic = 'force-dynamic';

export const GET = defineRoute({
  auth: 'none',
  async handler() {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API 文档 - GitHub Platform</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css">
  <style>
    body { margin: 0; padding: 0; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: "${baseUrl}/api/docs/openapi.json",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
        layout: "StandaloneLayout",
        docExpansion: "list",
        persistAuthorization: true,
        displayRequestDuration: true
      });
    };
  </script>
</body>
</html>`;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' },
    });
  },
});
