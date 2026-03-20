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
export const getPaymentStatusByCode = async (code: string) => {
  return prisma.order_status.findFirst({
    where: {
      type: "payment",
      code,
    },
  });
};

export const markPaymentSuccessFromCheckoutSession = async (session: {
  id: string;
  payment_status?: string | null;
  metadata?: Record<string, string> | null;
}) => {
  const paymentId = Number(session.metadata?.paymentId);

  if (!paymentId || Number.isNaN(paymentId)) {
    throw new Error("Invalid or missing paymentId in Stripe session metadata");
  }

  const successStatus = await prisma.order_status.findFirst({
    where: {
      type: "payment",
      code: "SUCCESS", // change this if your DB uses COMPLETED / PAID etc.
    },
  });

  if (!successStatus) {
    throw new Error(
      "Payment status not found for type='payment' and code='SUCCESS'",
    );
  }

  const payment = await prisma.payments.findFirst({
    where: {
      id: paymentId,
    },
  });

  if (!payment) {
    throw new Error(`Payment not found for id ${paymentId}`);
  }

  const existingExtra =
    payment.extra && typeof payment.extra === "object" ? payment.extra : {};

  const updatedPayment = await prisma.payments.update({
    where: {
      id: payment.id,
    },
    data: {
      status: successStatus.id,
      extra: {
        ...(existingExtra as object),
        stripeCheckoutSessionId: session.id,
        stripePaymentStatus: session.payment_status || "paid",
        paymentCompletedAt: new Date().toISOString(),
      },
      updated_at: new Date(),
    },
  });

  await prisma.payment_log.create({
    data: {
      payment_id: updatedPayment.id,
      event_type: "checkout.session.completed",
      payload: {
        stripeSessionId: session.id,
        paymentStatus: session.payment_status,
        metadata: session.metadata,
      },
    },
  });

  return updatedPayment;
};