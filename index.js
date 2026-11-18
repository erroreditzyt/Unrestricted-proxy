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

  // Set a user-agent string that mimics a real browser
  options.headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3';

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    if (err.code === 'ECONNREFUSED') {
      // Attempt to bypass the refused connection by using a different port or protocol
      const bypassOptions = {
        hostname: url.parse(targetUrl).hostname,
        port: url.parse(targetUrl).port || 443, // Try port 443 for HTTPS
        path: url.parse(targetUrl).path,
        method: req.method,
        headers: req.headers
      };
      // Set a user-agent string that mimics a real browser
      bypassOptions.headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3';

      const bypassReq = http.request(bypassOptions, (bypassRes) => {
        res.writeHead(bypassRes.statusCode, bypassRes.headers);
        bypassRes.pipe(res, { end: true });
      });
      bypassReq.on('error', (bypassErr) => {
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end('The target server refused the connection.');
      });
      req.pipe(bypassReq, { end: true });
    } else {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Proxy request failed');
    }
  });

  req.pipe(proxyReq, { end: true });
});

proxyServer.listen(80, () => {
  console.log('Proxy server is running on port 80');
});
