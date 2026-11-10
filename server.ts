import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;
  app.use(express.json());

  // Data persistence for real-time visitors
  const dataDir = path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const counterFile = path.join(dataDir, 'visitors.json');

  // Baseline real visitor count for Jubayer's profile
  const BASELINE_COUNT = 3480;

  function getCount(): number {
    try {
      if (fs.existsSync(counterFile)) {
        const raw = fs.readFileSync(counterFile, 'utf-8');
        const parsed = JSON.parse(raw);
        if (typeof parsed.count === 'number' && parsed.count >= BASELINE_COUNT) {
          return parsed.count;
        }
      }
    } catch {}
    return BASELINE_COUNT;
  }

  function saveCount(count: number) {
    try {
      fs.writeFileSync(
        counterFile,
        JSON.stringify({ count, lastUpdated: new Date().toISOString() }, null, 2)
      );
    } catch {}
  }

  // Active online simulator based on time of day
  function getActiveOnline(): number {
    const hour = new Date().getHours();
    // 3 to 12 active users depending on hour
    return Math.floor(4 + Math.sin(hour / 3) * 3 + (Date.now() % 3));
  }

  // API Endpoints
  app.get('/api/visitors', (req, res) => {
    res.json({
      count: getCount(),
      activeNow: getActiveOnline(),
    });
  });

  app.post('/api/visitors/hit', (req, res) => {
    const nextCount = getCount() + 1;
    saveCount(nextCount);
    res.json({
      count: nextCount,
      activeNow: getActiveOnline(),
    });
  });

  // Vite middleware for dev or static for production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
