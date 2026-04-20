import mongoose from "mongoose";

// 👉 dotenv should ONLY run in local development
if (process.env.NODE_ENV === "development") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("dotenv").config();
}

export const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("❌ MONGO_URI is not defined");
    }

    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${(error as Error).message}`);
    process.exit(1);
  }
};
