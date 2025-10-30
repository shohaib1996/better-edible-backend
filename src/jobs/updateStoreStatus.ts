import { Store } from "../models/Store";

export const updateStoreStatuses = async () => {
  try {
    const stores = await Store.find();
    const now = new Date();

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const updates: any[] = [];
    let cleared = 0,
      green = 0,
      yellow = 0,
      red = 0;

    for (const store of stores) {
      // Ensure numeric due
      const due =
        typeof store.dueAmount === "number"
          ? store.dueAmount
          : parseFloat(store.dueAmount as any);

      // Skip invalid reps
      if (store.rep === null || store.rep === undefined) {
        // @ts-ignore
        store.rep = undefined;
      }

      // Default
      let newStatus: "green" | "yellow" | "red" | null = null;

      // ✅ Only stores with due > 0 should have color
      if (due > 0) {
        if (store.lastPaidAt) {
          const diffDays = Math.floor(
            (now.getTime() - store.lastPaidAt.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (diffDays <= 7) {
            newStatus = "green";
            green++;
          } else if (diffDays <= 30) {
            newStatus = "yellow";
            yellow++;
          } else {
            newStatus = "red";
            red++;
          }
        } else {
          // theoretically shouldn't happen if due > 0
          newStatus = "red";
          red++;
        }
      } else {
        // No due → no color
        newStatus = null;
        cleared++;
      }

      // Update only if changed
      if (store.paymentStatus !== newStatus) {
        updates.push({
          updateOne: {
            filter: { _id: store._id },
            update: { $set: { paymentStatus: newStatus } },
          },
        });
      }
    }

    if (updates.length > 0) {
      await Store.bulkWrite(updates);
    }

    console.log(
      `✅ Store payment statuses updated — Green: ${green}, Yellow: ${yellow}, Red: ${red}, Cleared(no due): ${cleared}`
    );
  } catch (err) {
    console.error("❌ Error in updateStoreStatuses:", err);
  }
};
