const http = require('http');
const url = require('url');

const proxyServer = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const targetUrl = parsedUrl.query.url;

  if (!targetUrl) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('URL parameter is required');
    return;
  }

  const options = {
    hostname: url.parse(targetUrl).hostname,
    port: url.parse(targetUrl).port || 80,
    path: url.parse(targetUrl).path,
    method: req.method,
    headers: req.headers
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Proxy request failed');
  });

  req.pipe(proxyReq, { end: true });
});

proxyServer.listen(80, () => {
  console.log('Proxy server is running on port 80');
});
