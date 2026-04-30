import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Notifies the order service that payment succeeded so it can update payment_id + status
async function notifyOrderService(
  orderId: number,
  transactionId: number,
  authToken: string
): Promise<void> {
  const url = process.env.ORDER_SERVICE_URL;
  if (!url) return;
  try {
    await fetch(`${url}/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ statusCode: 'CONFIRMED', paymentId: String(transactionId) }),
    });
  } catch (err) {
    console.error('[payment-service] failed to notify order service (non-fatal):', err);
  }
}

export class PaymentService {
  static async initiatePayment(data: {
    orderId: number;
    amount: number;
    currency?: string;
    userUuid: string;
    gateway?: string;
  }) {
    return prisma.payment_transaction.create({
      data: {
        order_id: data.orderId,
        user_uuid: data.userUuid,
        gateway: data.gateway ?? 'manual',
        status: 'PENDING',
        amount: data.amount,
        currency: data.currency ?? 'USD',
        created_by: data.userUuid,
        status_history: {
          create: { status: 'PENDING', changed_by: data.userUuid },
        },
      },
      include: { status_history: true },
    });
  }

  static async confirmPayment(
    transactionId: number,
    data: { gatewayRef?: string; userUuid: string; authToken: string }
  ) {
    const txn = await prisma.payment_transaction.findFirst({
      where: { id: transactionId, is_deleted: false },
    });
    if (!txn) throw new Error('Payment transaction not found');
    if (txn.status === 'SUCCEEDED') throw new Error('Payment already confirmed');

    const updated = await prisma.$transaction(async (tx) => {
      await tx.payment_status_history.create({
        data: {
          transaction_id: transactionId,
          status: 'SUCCEEDED',
          changed_by: data.userUuid,
        },
      });
      return tx.payment_transaction.update({
        where: { id: transactionId },
        data: {
          status: 'SUCCEEDED',
          gateway_ref: data.gatewayRef ?? null,
          updated_at: new Date(),
        },
        include: { status_history: { orderBy: { changed_at: 'desc' } } },
      });
    });

    // Tell order service the payment went through
    await notifyOrderService(txn.order_id, transactionId, data.authToken);

    return updated;
  }

  static async failPayment(transactionId: number, userUuid: string) {
    const txn = await prisma.payment_transaction.findFirst({
      where: { id: transactionId, is_deleted: false },
    });
    if (!txn) throw new Error('Payment transaction not found');

    return prisma.$transaction(async (tx) => {
      await tx.payment_status_history.create({
        data: { transaction_id: transactionId, status: 'FAILED', changed_by: userUuid },
      });
      return tx.payment_transaction.update({
        where: { id: transactionId },
        data: { status: 'FAILED', updated_at: new Date() },
        include: { status_history: { orderBy: { changed_at: 'desc' } } },
      });
    });
  }

  static async getByOrder(orderId: number) {
    return prisma.payment_transaction.findFirst({
      where: { order_id: orderId, is_deleted: false },
      include: { status_history: { orderBy: { changed_at: 'desc' } } },
      orderBy: { created_at: 'desc' },
    });
  }

  static async getTransaction(id: number) {
    return prisma.payment_transaction.findFirst({
      where: { id, is_deleted: false },
      include: { status_history: { orderBy: { changed_at: 'desc' } } },
    });
  }
}