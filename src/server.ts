// src/server.ts
// dotenv must load before any other imports so env vars are available at module init time
// eslint-disable-next-line @typescript-eslint/no-require-imports
require("dotenv").config();

import app from "./app";
import { connectDB } from "./config/db";

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
  process.exit(1);
});
import { updateStoreStatuses } from "./jobs/updateStoreStatus";
import { runDailyClientOrderJobs } from "./jobs/clientOrderJobs";
import cron from "node-cron";

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

    // 🕒 Run client order jobs daily at 6 AM (server time)
    // - Auto-push orders to production when productionStartDate arrives
    // - Send 7-day reminder emails
    cron.schedule("0 6 * * *", async () => {
      console.log("⏰ Running scheduled client order jobs...");
      await runDailyClientOrderJobs();
    });

    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  });
