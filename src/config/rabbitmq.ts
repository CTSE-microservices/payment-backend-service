export const rabbitmqConfig = {
  url: process.env.RABBITMQ_URL!,
  exchange: process.env.RABBITMQ_EXCHANGE || "commerce.events",
  orderCreatedQueue:
    process.env.RABBITMQ_ORDER_CREATED_QUEUE || "payment.order.created.q",
};
