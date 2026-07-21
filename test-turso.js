const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.DATABASE_URL || "libsql://pc-memorial-anuragraoshg.aws-ap-south-1.turso.io",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

client.execute("SELECT 1").then((r) => {
  console.log("SUCCESS:", r);
  process.exit(0);
}).catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});