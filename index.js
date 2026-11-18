
const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 10000;

const allowedHosts = new Set(
    (process.env.ALLOWED_HOSTS || "example.com")
        .split(",")
        .map(host => host.trim().toLowerCase())
        .filter(Boolean)
);

const server = http.createServer((req, res) => {

    function send(status, message) {
        res.writeHead(status, {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-store"
        });

        res.end(message);
    }

    let parsedUrl;

    try {
        parsedUrl = new URL(req.url, "http://localhost");
    } catch {
        return send(400, "Invalid request URL");
    }

    // Only support GET and HEAD requests
    if (!["GET", "HEAD"].includes(req.method)) {
        return send(405, "Method not allowed");
    }

    // Render health check
    if (parsedUrl.pathname === "/health") {
        return send(200, "OK");
    }

    // Serve the homepage
    if (parsedUrl.pathname === "/") {
        fs.readFile(
            path.join(__dirname, "index.html"),
            (err, data) => {
                if (err) {
                    console.error(err);
                    return send(500, "index.html not found");
                }

                res.writeHead(200, {
                    "Content-Type": "text/html; charset=utf-8",
                    "Cache-Control": "no-store"
                });

                res.end(data);
            }
        );

        return;
    }

    // Proxy endpoint
    if (parsedUrl.pathname !== "/proxy") {
        return send(404, "Page not found");
    }

    const targetUrl = parsedUrl.searchParams.get("url");

    if (!targetUrl) {
        return send(400, "URL parameter is required");
    }

    let target;

    try {
        target = new URL(targetUrl);
    } catch {
        return send(400, "Invalid website URL");
    }

    // Validate the destination
    if (
        !["http:", "https:"].includes(target.protocol) ||
        !allowedHosts.has(target.hostname) ||
        target.username ||
        target.password ||
        target.port
    ) {
        return send(403, "This destination is not allowed");
    }

    // Select the correct protocol
    const transport =
        target.protocol === "https:" ? https : http;

    console.log("Request:", target.href);

    const proxyReq = transport.request(
        target,
        {
            method: req.method,
            headers: {
                "User-Agent": "NodeWebPreview/1.0",
                "Accept": "*/*",
                "Accept-Encoding": "identity"
            }
        },
        proxyRes => {

            // Prevent redirect loops
            if (
                proxyRes.statusCode >= 300 &&
                proxyRes.statusCode < 400
            ) {
                proxyRes.resume();

                return send(
                    502,
                    "The destination returned a redirect."
                );
            }

            const headers = {
                "Content-Type":
                    proxyRes.headers["content-type"] ||
                    "application/octet-stream",

                "Cache-Control": "no-store",

                "Content-Security-Policy":
                    "sandbox; default-src 'none'; style-src 'unsafe-inline'",

                "X-Content-Type-Options": "nosniff",

                "Referrer-Policy": "no-referrer"
            };

            if (proxyRes.headers["content-encoding"]) {
                headers["Content-Encoding"] =
                    proxyRes.headers["content-encoding"];
            }

            proxyRes.on("error", error => {
                console.error(error.message);
                res.destroy();
            });

            res.writeHead(proxyRes.statusCode, headers);
            proxyRes.pipe(res);
        }
    );

    // Request timeout
    proxyReq.setTimeout(15000, () => {
        proxyReq.destroy(new Error("Request timed out"));
    });

    // Handle connection errors
    proxyReq.on("error", error => {
        console.error("Proxy error:", error.message);

        if (!res.headersSent) {
            send(502, "Connection failed: " + error.message);
        } else {
            res.destroy();
        }
    });

    res.on("close", () => {
        proxyReq.destroy();
    });

    proxyReq.end();
});

// Start the Render server
server.listen(PORT, "0.0.0.0", () => {
    console.log(`Proxy server running on port ${PORT}`);
});

server.on("error", error => {
    console.error("Server error:", error.message);
});
