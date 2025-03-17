import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/bankDB";

if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not defined in the environment variables.");
}

// Global cache to prevent multiple connections
let cached = global.mongoose || { conn: null, promise: null };

async function connectDB() {
    if (cached.conn) return cached.conn;

    if (!cached.promise) {
        cached.promise = mongoose.connect(MONGODB_URI, {})
            .then((mongoose) => mongoose);
    }
    
    cached.conn = await cached.promise;
    return cached.conn;
}

export default connectDB;
