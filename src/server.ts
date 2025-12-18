// src/server.ts
import app from "./app";
import { connectDB } from "./config/db";
import { updateStoreStatuses } from "./jobs/updateStoreStatus";
import cron from "node-cron";

// 👉 dotenv is ONLY for local development
if (process.env.NODE_ENV === "development") {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require("dotenv").config();
}

const PORT = process.env.PORT || 5000;

// Connect DB and start server
connectDB()
  .then(async () => {
    console.log("✅ MongoDB Connected");

    // 🧪 Run once immediately for testing
    console.log("⚙️ Running store status update test...");
    await updateStoreStatuses();
    console.log("✅ Store status update test complete.");

    // 🕒 Run daily at midnight (server time)
    cron.schedule("0 0 * * *", async () => {
      console.log("⏰ Running scheduled store status update...");
      await updateStoreStatuses();
    });

    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  });
