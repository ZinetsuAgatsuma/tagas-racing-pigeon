import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config({ path: '.env' });
dotenv.config();

async function clearMongo() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME || 'pigeon-racing';

  if (!uri) {
    throw new Error('MONGODB_URI is not set in .env');
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);
    const collections = ['players', 'lofts', 'events', 'registrations', 'auditLogs', 'notifications'];

    for (const name of collections) {
      const result = await db.collection(name).deleteMany({});
      console.log(`Cleared ${name}: ${result.deletedCount} document(s) removed.`);
    }

    console.log(`MongoDB database "${dbName}" is now cleared for app collections.`);
  } finally {
    await client.close();
  }
}

clearMongo().catch((err) => {
  console.error('Failed to clear MongoDB data:', err);
  process.exit(1);
});
