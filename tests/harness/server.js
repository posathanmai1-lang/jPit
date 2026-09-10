// Lightweight HTTP Test Harness Server
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const HARNESS_PATH = path.join(__dirname, 'test-harness.html');

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/harness.html') {
    fs.readFile(HARNESS_PATH, (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading test harness file');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`[jPit Test Harness Server] Running at http://localhost:${PORT}/`);
});
