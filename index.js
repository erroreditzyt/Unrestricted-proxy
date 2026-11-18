
const http = require("http");
const https = require("https");

const PORT = process.env.PORT || 3000;

const allowedHosts = new Set(
  (process.env.ALLOWED_HOSTS || "example.com")
    .split(",")
    .map(host => host.trim().toLowerCase())
);

const server = http.createServer((req, res) => {
  const send = (status, message) => {
    res.writeHead(status, {
      "Content-Type": "text/plain"
    });
    res.end(message);
  };

  const parsedUrl = new URL(req.url, "http://localhost");
  const targetUrl = parsedUrl.searchParams.get("url");

  if (!targetUrl) {
    return send(200, "Proxy server is online!");
  }

  if (!["GET", "HEAD"].includes(req.method)) {
    return send(405, "Method not allowed");
  }

  let target;

  try {
    target = new URL(targetUrl);
  } catch {
    return send(400, "Invalid URL");
  }

  if (
    !["http:", "https:"].includes(target.protocol) ||
    !allowedHosts.has(target.hostname) ||
    target.username ||
    target.password ||
    target.port
  ) {
    return send(403, "Target is not allowed");
  }

  const transport =
    target.protocol === "https:" ? https : http;

  const proxyReq = transport.request(
    target,
    {
      method: req.method,
      headers: {
        "User-Agent": "RenderNodeProxy/1.0",
        "Accept": "*/*"
      }
    },
    proxyRes => {
      const headers = {
        "Content-Type":
          proxyRes.headers["content-type"] ||
          "application/octet-stream"
      };

      if (proxyRes.headers["content-encoding"]) {
        headers["Content-Encoding"] =
          proxyRes.headers["content-encoding"];
      }

      if (
        proxyRes.statusCode >= 300 &&
        proxyRes.statusCode < 400 &&
        proxyRes.headers.location
      ) {
        proxyRes.resume();
        return send(502, "Upstream redirect not supported");
      }

      res.writeHead(proxyRes.statusCode, headers);
      proxyRes.pipe(res);
    }
  );

  proxyReq.setTimeout(15000, () => {
    proxyReq.destroy(new Error("Request timed out"));
  });

  proxyReq.on("error", err => {
    console.error("Proxy error:", err.message);

    if (!res.headersSent) {
      send(502, "Unable to connect to target");
    } else {
      res.destroy();
    }
  });

  res.on("close", () => proxyReq.destroy());

  proxyReq.end();
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Proxy server running on port ${PORT}`);
});
