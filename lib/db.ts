import { MongoClient } from "mongodb";

const globalForMongo = global as typeof globalThis & { mongoClient?: Promise<MongoClient> };
export async function db() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Missing MONGODB_URI in environment variables");
  if (!globalForMongo.mongoClient) {
    globalForMongo.mongoClient = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 })
      .connect()
      .catch((error: Error) => {
        // Do not retain a rejected connection promise: the next request can retry after a network fix.
        delete globalForMongo.mongoClient;
        console.error("MongoDB connection failed:", error.message);
        throw error;
      });
  }
  return (await globalForMongo.mongoClient).db();
}
