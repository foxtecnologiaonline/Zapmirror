// Mock mínimo da Evolution API, só pra validar em dev/CI que
// apps/api/src/lib/evolutionClient.ts manda os requests certos e sabe ler as
// respostas — NÃO é um substituto pra testar contra a Evolution de verdade do
// Vultr (ver ESCOPO_ZAPMIRROR.md §4).
import { createServer } from 'node:http';

const PORT = process.env.MOCK_EVOLUTION_PORT ?? 3200;

const server = createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'POST' && req.url === '/instance/create') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      const { instanceName } = JSON.parse(body);
      res.writeHead(201);
      res.end(JSON.stringify({ instanceName, apiKey: 'mock-api-key', qrCode: null }));
    });
    return;
  }

  if (req.method === 'GET' && req.url?.startsWith('/instance/connectionState/')) {
    res.writeHead(200);
    res.end(JSON.stringify({ instance: { state: 'connecting' } }));
    return;
  }

  if (req.method === 'GET' && req.url?.startsWith('/instance/connect/')) {
    res.writeHead(200);
    res.end(JSON.stringify({ base64: 'data:image/png;base64,mock' }));
    return;
  }

  if (req.method === 'DELETE' && req.url?.startsWith('/instance/delete/')) {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'deleted' }));
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'rota_nao_mapeada_no_mock' }));
});

server.listen(PORT, () => {
  console.log(`mock-evolution ouvindo em :${PORT}`);
});
