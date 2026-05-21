const { program } = require('commander');
const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const superagent = require('superagent');

program
  .requiredOption('-h, --host <address>', 'адреса сервера')
  .requiredOption('-p, --port <number>', 'порт сервера')
  .requiredOption('-c, --cache <path>', 'шлях до директорії з кешем')
  .configureOutput({
  writeErr: (str) => {
    if (str.includes("required option") || str.includes("argument missing")) {
      process.stderr.write("Помилка: Необхідно вказати всі обов'язкові параметри (-h, -p, -c)!\n");
    } else {
      process.stderr.write(str);
    }
    process.exit(1); 
  }
});

program.parse(process.argv);
const { host, port, cache } = program.opts();

const startServer = async () => {
  await fs.mkdir(cache, { recursive: true });

  const server = http.createServer(async (req, res) => {
    const code = req.url.slice(1);
    const filePath = path.join(cache, `${code}.jpg`);

    if (req.method === 'GET') {
      try {
        const image = await fs.readFile(filePath);
        res.writeHead(200, { 'Content-Type': 'image/jpeg' });
        res.end(image);
      } catch (error) {
        try {
          const response = await superagent.get(`https://http.cat/${code}`);
          const imageBuffer = response.body;
          
          await fs.writeFile(filePath, imageBuffer);
          res.writeHead(200, { 'Content-Type': 'image/jpeg' });
          res.end(imageBuffer);
        } catch (fetchError) {
          res.writeHead(404);
          res.end('Not Found');
        }
      }
    } else if (req.method === 'PUT') {
      const chunks = [];
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', async () => {
        const buffer = Buffer.concat(chunks);
        await fs.writeFile(filePath, buffer);
        res.writeHead(201);
        res.end('Created');
      });
    } else if (req.method === 'DELETE') {
      try {
        await fs.unlink(filePath);
        res.writeHead(200);
        res.end('Deleted');
      } catch (error) {
        res.writeHead(404);
        res.end('Not Found');
      }
    } else {
      res.writeHead(405);
      res.end('Method Not Allowed');
    }
  });

  server.listen(port, host, () => {
    console.log(`Сервер запущен на http://${host}:${port}`);
  });
};

startServer();