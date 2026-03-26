import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

const rootDir = resolve(process.cwd());
const port = Number(process.env.PORT || 4173);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf"
};

function resolveRequestPath(urlPath) {
  const safePath = normalize(decodeURIComponent(urlPath.split("?")[0])).replace(/^([/\\])+/, "");
  const relativePath = safePath && safePath !== "." ? safePath : "index.html";
  return join(rootDir, relativePath);
}

async function canReuseExistingServer() {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/healthz`, { method: "GET" });
    return response.ok;
  } catch (_error) {
    return false;
  }
}

const server = createServer(async (request, response) => {
  try {
    const urlPath = request.url || "/";
    if (urlPath === "/healthz") {
      response.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
      response.end("ok");
      return;
    }

    const filePath = resolveRequestPath(urlPath);
    const data = await readFile(filePath);
    const mimeType = mimeTypes[extname(filePath).toLowerCase()] || "application/octet-stream";

    response.writeHead(200, {
      "content-type": mimeType,
      "cache-control": "no-store"
    });
    response.end(data);
  } catch (_error) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("not found");
  }
});

server.on("error", async (error) => {
  if (error && error.code === "EADDRINUSE" && await canReuseExistingServer()) {
    process.stdout.write(`AraLearn test server already running at http://127.0.0.1:${port}\n`);
    process.exit(0);
    return;
  }

  process.stderr.write(String((error && error.stack) || error || "Server error") + "\n");
  process.exit(1);
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`AraLearn test server running at http://127.0.0.1:${port}\n`);
});
