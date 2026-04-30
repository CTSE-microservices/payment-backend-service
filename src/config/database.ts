import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const datasourceUrl = process.env.DATABASE_URL;
if (!datasourceUrl) {
  throw new Error('DATABASE_URL is not set');
}

export const dbConfig = {
  url: datasourceUrl,
};

const pool = new Pool({ connectionString: datasourceUrl });
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });
