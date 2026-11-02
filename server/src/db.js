import mongoose from "mongoose";

let connectionPromise;

export async function connectDatabase(uri = process.env.MONGODB_URI) {
  if (!uri) {
    throw new Error("MONGODB_URI is required before the API can start.");
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(uri, {
      maxPoolSize: 10,
      minPoolSize: 0,
      serverSelectionTimeoutMS: 5000
    }).catch((error) => {
      connectionPromise = undefined;
      throw error;
    });
  }

  await connectionPromise;
  return mongoose.connection;
}

export async function disconnectDatabase() {
  connectionPromise = undefined;
  await mongoose.disconnect();
}

export function isDatabaseReady() {
  return mongoose.connection.readyState === 1;
}
