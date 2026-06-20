const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const port = Number(process.argv[2] || 8090);
const host = process.env.HOST || process.argv[3] || "0.0.0.0";
const types = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".json": "application/json",
};

http
  .createServer((req, res) => {
    const url = decodeURIComponent((req.url || "/").split("?")[0]);
    const safe = path.normalize(url).replace(/^(\.\.[/\\])+/, "");
    const file = path.join(root, safe === "/" || safe === "\\" ? "index.html" : safe);
    if (!file.startsWith(root)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" });
      res.end(data);
    });
  })
  .listen(port, host, () => {
    console.log(`Serving ${root} at http://${host}:${port}/`);
  });
