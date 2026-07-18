import { ClientOrder } from "../models/ClientOrder";
import { sendProductionStartedNotification, sendSevenDayReminders } from "./clientOrderNotifications";

export const autoPushOrdersToProduction = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const ordersToStart = await ClientOrder.find({
      status: "waiting",
      productionStartDate: { $lte: today },
      shipASAP: false,
    });

    let pushed = 0;

    for (const order of ordersToStart) {
      order.status = "cooking_molding";
      await order.save();
      pushed++;
      console.log(`📦 Order ${order.orderNumber} pushed to production (Cooking & Molding)`);
      await sendProductionStartedNotification(order);
    }

    console.log(`✅ Auto-push complete: ${pushed} orders pushed to production`);
  } catch (err) {
    console.error("❌ Error in autoPushOrdersToProduction:", err);
  }
};

export const runDailyClientOrderJobs = async () => {
  console.log("⏰ Running daily client order jobs...");

  await autoPushOrdersToProduction();
  await sendSevenDayReminders();

  console.log("✅ Daily client order jobs complete");
};
