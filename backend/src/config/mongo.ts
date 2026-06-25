import { MongoClient } from "mongodb";
import "dotenv/config";

const mongoClient = new MongoClient(
  process.env.MONGO_URL || "mongodb://localhost:27017",
);

let connected = false;

export async function getMongoDb() {
  if (!connected) {
    await mongoClient.connect();
    connected = true;
    console.log("[mongo] connected");
  }
  return mongoClient.db("leaderboard");
}

export { mongoClient };
