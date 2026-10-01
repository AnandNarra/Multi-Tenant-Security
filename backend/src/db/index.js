import { drizzle } from 'drizzle-orm/node-postgres';
import { pool } from '../config/db.js';
import * as schema from './schema/index.js';

export const db = drizzle(pool, { schema });
export default db;
