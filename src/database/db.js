import mongoose from 'mongoose';

//const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_URI = "mongodb+srv://ditsscloud_db_user:ZIUOFpmNOqWShQVC@asuma-cluster.pmod26g.mongodb.net/asuma-api?retryWrites=true&w=majority&appName=Asuma-Cluster";
if (!MONGODB_URI) {
  throw new Error('Please define MONGODB_URI environment variable');
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
    console.log('MongoDB Connected');
    return cached.conn;
  } catch (error) {
    cached.promise = null;
    throw error;
  }
}
