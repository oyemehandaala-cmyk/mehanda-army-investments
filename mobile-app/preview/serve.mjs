import { createServer } from 'node:http';
import { readFile } from 'node:fs';
import { fileURLToPath } from 'node:url';

const port = Number(process.env.PORT ?? 4173);
const previewFile = fileURLToPath(new URL('./index.html', import.meta.url));
const paths = new Set(['/', '/preview', '/preview/']);

createServer((request, response) => {
  const pathname = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`).pathname;
  if (request.method !== 'GET') {
    response.writeHead(405, { Allow: 'GET' });
    response.end('Method not allowed');
    return;
  }
  if (!paths.has(pathname)) {
    response.writeHead(404);
    response.end('Not found');
    return;
  }

  readFile(previewFile, (error, content) => {
    if (error) {
      console.error('Could not read the mobile preview page:', error);
      response.writeHead(500);
      response.end('Could not load preview');
      return;
    }
    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/html; charset=utf-8',
    });
    response.end(content);
  });
}).listen(port, '0.0.0.0', () => {
  console.log(`Mobile preview ready at http://127.0.0.1:${port}/preview/`);
});
