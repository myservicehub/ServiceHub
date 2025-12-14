const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PREVIEW_PORT || 5500;
const file = path.join(__dirname, 'preview.html');

const server = http.createServer((req, res) => {
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Error loading preview');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(data);
  });
});

server.listen(port, () => {
  console.log(`Preview available at http://localhost:${port}/`);
});