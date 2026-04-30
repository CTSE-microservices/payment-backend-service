import { Request, Response, NextFunction } from 'express';
import { PaymentService } from './payment.service.js';

function getUserUuid(req: Request): string {
  return (req as any).user?.sub ?? '';
}

export class PaymentController {
  static async initiate(req: Request, res: Response, next: NextFunction) {
    try {
      const { orderId, amount, currency, gateway } = req.body as {
        orderId: number;
        amount: number;
        currency?: string;
        gateway?: string;
      };
      if (!orderId || !amount) {
        return res.status(400).json({ message: 'orderId and amount are required' });
      }
      const txn = await PaymentService.initiatePayment({
        orderId,
        amount,
        currency,
        gateway,
        userUuid: getUserUuid(req),
      });
      return res.status(201).json(txn);
    } catch (err) {
      next(err);
    }
  }

  static async confirm(req: Request, res: Response, next: NextFunction) {
    try {
      const transactionId = parseInt(String(req.params.transactionId), 10);
      if (isNaN(transactionId)) {
        return res.status(400).json({ message: 'Invalid transaction ID' });
      }
      const { gatewayRef } = req.body as { gatewayRef?: string };
      const authHeader = req.headers.authorization ?? '';
      const txn = await PaymentService.confirmPayment(transactionId, {
        gatewayRef,
        userUuid: getUserUuid(req),
        authToken: authHeader.replace('Bearer ', ''),
      });
      return res.json(txn);
    } catch (err) {
      next(err);
    }
  }

  static async fail(req: Request, res: Response, next: NextFunction) {
    try {
      const transactionId = parseInt(String(req.params.transactionId), 10);
      if (isNaN(transactionId)) {
        return res.status(400).json({ message: 'Invalid transaction ID' });
      }
      const txn = await PaymentService.failPayment(transactionId, getUserUuid(req));
      return res.json(txn);
    } catch (err) {
      next(err);
    }
  }

  static async getByOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const orderId = parseInt(String(req.params.orderId), 10);
      if (isNaN(orderId)) {
        return res.status(400).json({ message: 'Invalid order ID' });
      }
      const txn = await PaymentService.getByOrder(orderId);
      if (!txn) return res.status(404).json({ message: 'No payment found for this order' });
      return res.json(txn);
    } catch (err) {
      next(err);
    }
  }

  static async getTransaction(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(String(req.params.transactionId), 10);
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid transaction ID' });
      const txn = await PaymentService.getTransaction(id);
      if (!txn) return res.status(404).json({ message: 'Transaction not found' });
      return res.json(txn);
    } catch (err) {
      next(err);
    }
  }
}