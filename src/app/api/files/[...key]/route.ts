export const dynamic = 'force-dynamic';
import { defineRoute } from '@/lib/framework/define-route';
import { getFileStream, getFile } from '@/lib/storage';

export const GET = defineRoute({
  auth: 'none',
  async handler({ params }) {
    const storageKey = (params.key as unknown as string[]).join('/');

    // 流式读取（大文件友好）
    const streamResult = await getFileStream(storageKey);
    if (streamResult) {
      return new Response(streamResult.stream, {
        headers: {
          'Content-Type': streamResult.contentType,
          'Content-Length': String(streamResult.contentLength),
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    // 降级：Buffer 读取
    const buf = await getFile(storageKey);
    if (buf) {
      return new Response(new Uint8Array(buf), {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Length': String(buf.length),
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    return new Response('File not found', { status: 404 });
  },
});
