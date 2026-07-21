const { PrismaClient } = require('@prisma/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');

async function main() {
  const oldDb = new PrismaClient({
    datasourceUrl: 'file:C:/Users/Anurag/Downloads/Documents/pc-memorial-hospital prescription - Copy/db/custom.db',
  });

  const adapter = new PrismaLibSql({
    url: process.env.DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  const newDb = new PrismaClient({ adapter });

  console.log('Migrating MedicineMaster...');
  const medicines = await oldDb.medicineMaster.findMany();
  if (medicines.length) {
    await newDb.medicineMaster.createMany({ data: medicines });
  }
  console.log(`  -> ${medicines.length} rows migrated`);

  await oldDb.$disconnect();
  await newDb.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});