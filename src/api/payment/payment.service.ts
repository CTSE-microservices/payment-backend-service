import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

interface CreatePendingPaymentInput {
  orderId: number;
  userUuid: string;
  amount: number | string;
  currency: string;
  paymentMethod?: string;
  gateway?: string;
  rawMessage?: unknown;
}

export const createPendingPaymentFromOrderCreated = async (
  input: CreatePendingPaymentInput,
) => {
  const {
    orderId,
    userUuid,
    amount,
    currency,
    paymentMethod = "stripe",
    gateway = "stripe",
    rawMessage,
  } = input;

  const existingPayment = await prisma.payments.findFirst({
    where: {
      order_id: orderId,
    },
  });

  if (existingPayment) {
    return existingPayment;
  }

  const processingStatus = await prisma.order_status.findFirst({
    where: {
      type: "payment",
      code: "PROCESSING",
    },
  });

  if (!processingStatus) {
    throw new Error(
      "Payment status not found for type='payment' and code='PROCESSING'",
    );
  }

  const decimalAmount = new Prisma.Decimal(amount);

  const payment = await prisma.payments.create({
    data: {
      order_id: orderId,
      user_uuid: userUuid,
      amout: decimalAmount,
      currency,
      payment_method: paymentMethod,
      status: processingStatus.id,
      gateway,
      extra: {
        source: "order.created",
      },
    },
  });

  await prisma.payment_log.create({
    data: {
      payment_id: payment.id,
      event_type: "order.created.received",
    },
  });

  return payment;
};

export const getPaymentByOrderId = async (orderId: number) => {
  return prisma.payments.findFirst({
    where: {
      order_id: orderId,
    },
    include: {
      order_status: true,
      refunds: true,
    },
  });
};
