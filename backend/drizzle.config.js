import dotenv from 'dotenv';
dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set in your .env file");
}

export default {
  schema: './src/db/schema/index.js',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  // when true , logs every SQL statement that drizzle-kit runs
  verbose: true,
  // when true , asks for confirmation befror running destructive changes
  strict: true,
};
