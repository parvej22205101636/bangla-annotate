import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config.js';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1); // behind Render's proxy
  app.use(helmet());
  app.use(cors({ origin: config.clientUrls }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/auth', authRoutes);
  app.use('/api/projects', projectRoutes);

  app.use((req, res) => res.status(404).json({ message: 'Not found' }));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ message: 'File is larger than 5 MB' });
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  });
  return app;
}
