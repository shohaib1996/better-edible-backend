// src/server.ts
import app from "./app";
import { connectDB } from "./config/db";
import dotenv from "dotenv";
import { updateStoreStatuses } from "./jobs/updateStoreStatus";
import cron from "node-cron";

dotenv.config();
const PORT = process.env.PORT || 5000;

// Connect DB and start server
connectDB().then(async () => {
  console.log("✅ MongoDB Connected");

  // 🧪 Run once immediately for testing
  console.log("⚙️ Running store status update test...");
  await updateStoreStatuses();
  console.log("✅ Store status update test complete.");

  // 🕒 Schedule it to run every minute for testing (change later to 0 0 * * *)
  cron.schedule("0 0 * * *", async () => {
    console.log("⏰ Running scheduled store status update...");
    await updateStoreStatuses();
  });

  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
  });
});
