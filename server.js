const path = require('path');
const fs = require('fs');

const port = parseInt(process.env.PORT || '3000', 10);
const hostname = process.env.HOSTNAME || '0.0.0.0';

// Check if Next.js standalone server exists
const standaloneServerPath = path.join(__dirname, '.next', 'standalone', 'server.js');

if (fs.existsSync(standaloneServerPath)) {
  // Ensure static assets and public directory are accessible to standalone server
  try {
    const standaloneStatic = path.join(__dirname, '.next', 'standalone', '.next', 'static');
    const sourceStatic = path.join(__dirname, '.next', 'static');
    if (fs.existsSync(sourceStatic) && !fs.existsSync(standaloneStatic)) {
      fs.cpSync(sourceStatic, standaloneStatic, { recursive: true });
    }
    const standalonePublic = path.join(__dirname, '.next', 'standalone', 'public');
    const sourcePublic = path.join(__dirname, 'public');
    if (fs.existsSync(sourcePublic) && !fs.existsSync(standalonePublic)) {
      fs.cpSync(sourcePublic, standalonePublic, { recursive: true });
    }
  } catch (e) {
    console.warn('Could not sync static assets to standalone directory:', e.message);
  }

  process.env.PORT = String(port);
  process.env.HOSTNAME = hostname;
  require(standaloneServerPath);
} else {
  // Fallback to Next.js standard programmatic server
  const { createServer } = require('http');
  const { parse } = require('url');
  const next = require('next');

  const app = next({ dev: false, hostname, port });
  const handle = app.getRequestHandler();

  app.prepare().then(() => {
    createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error('Error occurred handling', req.url, err);
        res.statusCode = 500;
        res.end('internal server error');
      }
    }).listen(port, hostname, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
  }).catch((err) => {
    console.error('Failed to start Next.js server:', err);
    process.exit(1);
  });
}
