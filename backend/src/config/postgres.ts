import { Pool } from "pg";
import "dotenv/config";

export const pgPool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

pgPool.on("connect", () => {
  console.log("[postgres] client connected");
});

pgPool.on("error", (err) => {
  console.error("[postgres] pool error:", err.message);
});

// Quick helper to verify connectivity on boot
export async function testPostgresConnection() {
  const client = await pgPool.connect();
  try {
    await client.query("SELECT 1");
    console.log("[postgres] connection verified");
  } finally {
    client.release();
  }
}
