import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';

import adminStatusHandler from './api/admin/status';
import adminSetupHandler from './api/admin/setup';
import adminLoginHandler from './api/admin/login';
import adminSessionHandler from './api/admin/session';
import adminLogoutHandler from './api/admin/logout';
import adminMessagesHandler from './api/admin/messages/index';
import adminMessageByIdHandler from './api/admin/messages/[id]';
import contactHandler from './api/contact';
import visitorsHandler from './api/visitors';
import visitorsHitHandler from './api/visitors/hit';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '16kb' }));

  // Mount identical Vercel Function handlers for local / full-stack Node runtime
  app.all('/api/visitors', (req, res) => void visitorsHandler(req, res));
  app.all('/api/visitors/hit', (req, res) => void visitorsHitHandler(req, res));
  app.all('/api/contact', (req, res) => void contactHandler(req, res));

  app.all('/api/admin/status', (req, res) => void adminStatusHandler(req, res));
  app.all('/api/admin/setup', (req, res) => void adminSetupHandler(req, res));
  app.all('/api/admin/login', (req, res) => void adminLoginHandler(req, res));
  app.all('/api/admin/session', (req, res) => void adminSessionHandler(req, res));
  app.all('/api/admin/logout', (req, res) => void adminLogoutHandler(req, res));
  app.all('/api/admin/messages', (req, res) => void adminMessagesHandler(req, res));
  app.all('/api/admin/messages/:id', (req, res) => void adminMessageByIdHandler(req, res));

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
