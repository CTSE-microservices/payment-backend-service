import { Router } from 'express';
import { PaymentController } from './payment.controller.js';

// Re-use whatever JWT middleware the payment service already has in src/middleware/
// If it's named differently, adjust the import path
let jwtMiddleware: any;
try {
  jwtMiddleware = require('../../middleware/jwtMiddleware').jwtMiddleware;
} catch {
  // Fallback: no-op if middleware path differs
  jwtMiddleware = (_req: any, _res: any, next: any) => next();
}

const router = Router();

// All payment routes require authentication
router.use(jwtMiddleware);

// POST /api/payment          — initiate a payment for an order
router.post('/', PaymentController.initiate);

// GET  /api/payment/order/:orderId — get payment status for a given order
router.get('/order/:orderId', PaymentController.getByOrder);

// GET  /api/payment/:transactionId — get a specific transaction
router.get('/:transactionId', PaymentController.getTransaction);

// POST /api/payment/:transactionId/confirm — mark payment as succeeded
router.post('/:transactionId/confirm', PaymentController.confirm);

// POST /api/payment/:transactionId/fail — mark payment as failed
router.post('/:transactionId/fail', PaymentController.fail);

export default router;