import pkg from "pg";
import dotenv from "dotenv";
dotenv.config();
const { Pool } = pkg;

console.log("db url", process.env.DATABASE_URL);
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});
export default pool;
