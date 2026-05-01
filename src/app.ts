import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler.js';
import { swaggerSetup } from './api/swagger.js';
import paymentRouter from './api/payment/payment.routes.js';

dotenv.config({ quiet: true });

const app = express();

// ── Stripe webhook MUST receive the raw body for signature verification.
// Register express.raw() for this path BEFORE express.json() parses everything else.
app.use('/api/payment/webhook/stripe', express.raw({ type: 'application/json' }));

app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

app.get('/', (_req, res) => {
  res.json({
    service: 'payment-backend-service',
    status: 'ok',
    docs: '/api-docs',
    health: '/health',
  });
});

app.get('/favicon.ico', (_req, res) => res.status(204).end());
app.get('/apple-touch-icon.png', (_req, res) => res.status(204).end());
app.get('/apple-touch-icon-precomposed.png', (_req, res) => res.status(204).end());

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'payment-backend-service',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

app.get('/pipeline', (_req, res) => {
  res.json({ message: 'deployment pipeline working', time: new Date().toISOString() });
});

swaggerSetup(app);

app.use('/api/payment', paymentRouter);

app.use(errorHandler);

export default app;
