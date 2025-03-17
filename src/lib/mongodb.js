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
        const opts = {
            bufferCommands: false,
        };

        cached.promise = mongoose.connect(MONGODB_URI, opts)
            .then((mongoose) => {
                console.log("MongoDB Connected Successfully!");
                return mongoose;
            })
            .catch((error) => {
                console.error("MongoDB Connection Error:", error);
                throw error;
            });
    }
    
    try {
        cached.conn = await cached.promise;
        return cached.conn;
    } catch (error) {
        cached.promise = null;
        throw error;
    }
}

export default connectDB;
