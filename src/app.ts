import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler.js';
import { swaggerSetup } from './api/swagger.js';
import { dbConfig } from './config/database.js';
import { redisConfig } from './config/redis.js';
import orderRoutes from "./api/order/order.routes.js";

dotenv.config({ quiet: true });


const app = express();

app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use("/api/order", orderRoutes);

app.get('/', (req, res) => {
	res.json({
		service: 'payment-backend-service',
		status: 'ok',
		docs: '/api-docs',
		health: '/health',
		ready: '/ready'
	});
});

// Browsers auto-request these; return 204 to avoid noisy 404 logs.
app.get('/favicon.ico', (req, res) => res.status(204).end());
app.get('/apple-touch-icon.png', (req, res) => res.status(204).end());
app.get('/apple-touch-icon-precomposed.png', (req, res) => res.status(204).end());

app.get('/health', (req, res) => {
	res.json({
		status: 'ok',
		service: 'payment-backend-service',
		timestamp: new Date().toISOString(),
		uptimeSeconds: Math.floor(process.uptime())
	});
});
//CI/CD verification API
app.get('/pipeline', (req, res) => {
	res.json({
		message: 'deployment pipeline working',
		time: new Date().toISOString()
	});
});

swaggerSetup(app);

//app.use('/api/payment', paymentRouter);

app.use(errorHandler);

export default app;
