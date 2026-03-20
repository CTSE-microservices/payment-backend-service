import { PrismaClient, Prisma } from "@prisma/client";
import generateCode from "../../utils/geenerateCode.js";

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
  } = input;

  console.log("💰 createPendingPaymentFromOrderCreated called with:", input);

  const parsedOrderId = Number(orderId);

  const existingPayment = await prisma.payments.findFirst({
    where: {
      order_id: parsedOrderId,
    },
  });

  console.log("💰 existingPayment:", existingPayment);

  if (existingPayment) {
    return existingPayment;
  }

  const processingStatus = await prisma.order_status.findFirst({
    where: {
      type: "payment",
      code: "PROCESSING",
    },
  });

  console.log("💰 processingStatus:", processingStatus);

  if (!processingStatus) {
    throw new Error(
      "Payment status not found for type='payment' and code='PROCESSING'",
    );
  }

  const decimalAmount = new Prisma.Decimal(amount);

  console.log("💰 About to create payment with:", {
    order_id: parsedOrderId,
    user_uuid: userUuid,
    amount: decimalAmount.toString(),
    currency,
    status: processingStatus.id,
  });

  const payment = await prisma.payments.create({
    data: {
      order_id: parsedOrderId,
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

  const code = generateCode(payment.id, "PAYMT");
  await prisma.payments.update({
    where: {
      id: payment.id,
    },
    data: {
      payment_code: code,
    },
  });
  console.log("💰 Payment created:", payment);

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
