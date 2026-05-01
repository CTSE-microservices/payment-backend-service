import dotenv from 'dotenv';
dotenv.config({ quiet: true });

import app from './app.js';
import { logger } from './utils/logger.js';
import { startOrderConsumer } from './consumers/orderConsumer.js';

const PORT = process.env.PORT || 3001;

async function start() {
  // Start the RabbitMQ consumer before accepting HTTP traffic.
  // If RabbitMQ is unreachable the process will exit with an error —
  // this is intentional: we want the health check to fail rather than
  // silently drop order.confirmed messages.
  await startOrderConsumer();

  app.listen(PORT, () => {
    logger.info(`Payment Service running on port ${PORT}`);
  });
}

start().catch((err) => {
  logger.error({ err }, 'Failed to start payment service');
  process.exit(1);
});
