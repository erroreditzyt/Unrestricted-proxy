const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 10000;

const allowedHosts = new Set(
    (process.env.ALLOWED_HOSTS || "")
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

    if (!["GET", "HEAD"].includes(req.method)) {
        return send(405, "Method not allowed");
    }

    if (parsedUrl.pathname === "/health") {
        return send(200, "OK");
    }

    if (parsedUrl.pathname === "/") {
        fs.readFile(path.join(__dirname, "index.html"), (err, data) => {
            if (err) return send(500, "index.html not found");
            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            res.end(data);
        });
        return;
    }

    if (parsedUrl.pathname !== "/proxy") {
        return send(404, "Page not found");
    }

    const targetUrl = parsedUrl.searchParams.get("url");
    if (!targetUrl) return send(400, "URL parameter is required");

    let target;
    try {
        target = new URL(targetUrl);
    } catch {
        return send(400, "Invalid website URL");
    }

    if (!["http:", "https:"].includes(target.protocol)) {
        return send(403, "This destination is not allowed");
    }

    const transport = target.protocol === "https:" ? https : http;
    console.log("Request:", target.href);

    transport.get(target, (proxyRes) => {
        const chunks = [];
        
        // Collect all data
        proxyRes.on('data', (chunk) => chunks.push(chunk));
        
        proxyRes.on('end', () => {
            const htmlData = Buffer.concat(chunks).toString();
            
            // Create a full HTML wrapper with the CSS injected
            const finalHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>${target.hostname}</title>
                    <style>
                        /* Reset default browser styles */
                        html, body { margin: 0; padding: 0; width: 100%; height: 100%; }
                        
                        /* Force the website to fill the screen */
                        iframe { width: 100%; height: 100%; border: none; }
                        
                        /* Optional: Dark mode injection for better visuals */
                        body { background-color: #fff; } 
                    </style>
                </head>
                <body>
                    <iframe srcdoc="${htmlData.replace(/"/g, '&quot;')}"></iframe>
                </body>
                </html>
            `;

            res.writeHead(proxyRes.statusCode, {
                "Content-Type": "text/html; charset=utf-8"
            });
            res.end(finalHtml);
        });
    }).on('error', (err) => {
        console.error("Proxy error:", err.message);
        if (!res.headersSent) send(502, "Connection failed: " + err.message);
    });
});

server.listen(PORT, "0.0.0.0", () => {
    console.log(`Proxy server running on port ${PORT}`);
});

server.on("error", error => {
    console.error("Server error:", error.message);
});
