// src/jobs/clientOrderJobs.ts
import { ClientOrder, IClientOrder } from "../models/ClientOrder";
import { PrivateLabelClient } from "../models/PrivateLabelClient";
import {
  sendSevenDayReminderEmail,
  sendReadyToShipEmail,
  sendRecurringOrderCreatedEmail,
  sendOrderShippedEmail,
  sendOrderShippedRepEmail,
  sendOrderCreatedClientEmail,
  sendOrderInProductionEmail,
} from "../services/emailService";

// -------------------
// Helper: Format date
// -------------------
const formatDate = (date: Date): string => {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// -------------------
// Job 1: Auto-push orders to production
// Runs daily - pushes orders where productionStartDate <= today
// -------------------
export const autoPushOrdersToProduction = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find orders that should start production today or earlier
    const ordersToStart = await ClientOrder.find({
      status: "waiting",
      productionStartDate: { $lte: today },
      shipASAP: false, // shipASAP orders are pushed manually
    });

    let pushed = 0;

    for (const order of ordersToStart) {
      order.status = "stage_1";
      await order.save();
      pushed++;
      console.log(
        `📦 Order ${order.orderNumber} pushed to production (Stage 1)`
      );
      // Send production started notification to client
      await sendProductionStartedNotification(order);
    }

    console.log(`✅ Auto-push complete: ${pushed} orders pushed to production`);
  } catch (err) {
    console.error("❌ Error in autoPushOrdersToProduction:", err);
  }
};

// -------------------
// Send Order Created Notification (to client)
// Triggered when a new order is created
// (Called from controller, not scheduled)
// -------------------
export const sendOrderCreatedNotification = async (
  order: IClientOrder,
  isRecurring: boolean = false
): Promise<void> => {
  try {
    if (order.emailsSent.orderCreatedNotification) return;

    const populatedOrder = await ClientOrder.findById(order._id)
      .populate({
        path: "client",
        populate: { path: "store", select: "name address city state zip" },
      })
      .populate("assignedRep", "name email");

    if (!populatedOrder) return;

    const client = populatedOrder.client as any;
    const rep = populatedOrder.assignedRep as any;
    const store = client?.store;

    if (!client || !rep || !store) return;

    const emailSent = await sendOrderCreatedClientEmail({
      clientName: store.name,
      contactEmail: client.contactEmail,
      orderNumber: populatedOrder.orderNumber,
      deliveryDate: formatDate(populatedOrder.deliveryDate),
      items: populatedOrder.items.map((item) => ({
        flavorName: item.flavorName,
        productType: item.productType,
        quantity: item.quantity,
      })),
      total: populatedOrder.total,
      repName: rep.name,
      repEmail: rep.email,
      isRecurring,
    });

    if (emailSent) {
      populatedOrder.emailsSent.orderCreatedNotification = true;
      await populatedOrder.save();
    }
  } catch (err) {
    console.error("❌ Error sending order created notification:", err);
  }
};

// -------------------
// Send Production Started Notification (to client)
// Triggered when order status changes to stage_1
// (Called from controller, not scheduled)
// -------------------
export const sendProductionStartedNotification = async (
  order: IClientOrder
): Promise<void> => {
  try {
    if (order.emailsSent.productionStartedNotification) return;

    const populatedOrder = await ClientOrder.findById(order._id)
      .populate({
        path: "client",
        populate: { path: "store", select: "name address city state zip" },
      })
      .populate("assignedRep", "name email");

    if (!populatedOrder) return;

    const client = populatedOrder.client as any;
    const rep = populatedOrder.assignedRep as any;
    const store = client?.store;

    if (!client || !rep || !store) return;

    const emailSent = await sendOrderInProductionEmail({
      clientName: store.name,
      contactEmail: client.contactEmail,
      orderNumber: populatedOrder.orderNumber,
      deliveryDate: formatDate(populatedOrder.deliveryDate),
      items: populatedOrder.items.map((item) => ({
        flavorName: item.flavorName,
        productType: item.productType,
        quantity: item.quantity,
      })),
      total: populatedOrder.total,
      repName: rep.name,
      repEmail: rep.email,
    });

    if (emailSent) {
      populatedOrder.emailsSent.productionStartedNotification = true;
      await populatedOrder.save();
    }
  } catch (err) {
    console.error("❌ Error sending production started notification:", err);
  }
};

// -------------------
// Job 2: Send 7-day reminder emails
// Runs daily - sends reminder for orders 7 days before delivery
// -------------------
export const sendSevenDayReminders = async () => {
  try {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 7);
    targetDate.setHours(0, 0, 0, 0);

    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Find orders delivering in 7 days that haven't received reminder
    const orders = await ClientOrder.find({
      status: { $in: ["stage_1", "stage_2", "stage_3", "stage_4"] },
      deliveryDate: { $gte: targetDate, $lt: nextDay },
      "emailsSent.sevenDayReminder": false,
    })
      .populate({
        path: "client",
        populate: { path: "store", select: "name address city state zip" },
      })
      .populate("assignedRep", "name email")
      .populate("items.label", "flavorName productType");

    let sent = 0;

    for (const order of orders) {
      const client = order.client as any;
      const rep = order.assignedRep as any;
      const store = client?.store;

      if (!client || !rep || !store) continue;

      const emailSent = await sendSevenDayReminderEmail({
        clientName: store.name,
        contactEmail: client.contactEmail,
        orderNumber: order.orderNumber,
        deliveryDate: formatDate(order.deliveryDate),
        items: order.items.map((item) => ({
          flavorName: item.flavorName,
          productType: item.productType,
          quantity: item.quantity,
        })),
        total: order.total,
        repName: rep.name,
        repEmail: rep.email,
      });

      if (emailSent) {
        order.emailsSent.sevenDayReminder = true;
        await order.save();
        sent++;
      }
    }

    console.log(`✅ 7-day reminders sent: ${sent} emails`);
  } catch (err) {
    console.error("❌ Error in sendSevenDayReminders:", err);
  }
};

// -------------------
// Job 3: Send ready-to-ship notifications
// Triggered when order status changes to ready_to_ship
// (Called from controller, not scheduled)
// -------------------
export const sendReadyToShipNotification = async (
  order: IClientOrder
): Promise<void> => {
  try {
    if (order.emailsSent.readyToShipNotification) return;

    const populatedOrder = await ClientOrder.findById(order._id)
      .populate({
        path: "client",
        populate: { path: "store", select: "name address city state zip" },
      })
      .populate("assignedRep", "name email");

    if (!populatedOrder) return;

    const client = populatedOrder.client as any;
    const rep = populatedOrder.assignedRep as any;
    const store = client?.store;

    if (!client || !rep || !store) return;

    const emailSent = await sendReadyToShipEmail({
      clientName: store.name,
      contactEmail: client.contactEmail,
      orderNumber: populatedOrder.orderNumber,
      deliveryDate: formatDate(populatedOrder.deliveryDate),
      items: populatedOrder.items.map((item) => ({
        flavorName: item.flavorName,
        productType: item.productType,
        quantity: item.quantity,
      })),
      total: populatedOrder.total,
      repName: rep.name,
      repEmail: rep.email,
      shippingAddress: {
        name: store.name,
        address: store.address || "",
        city: store.city || "",
        state: store.state || "",
        zip: store.zip || "",
      },
    });

    if (emailSent) {
      populatedOrder.emailsSent.readyToShipNotification = true;
      await populatedOrder.save();
    }
  } catch (err) {
    console.error("❌ Error sending ready-to-ship notification:", err);
  }
};

// -------------------
// Job 4: Send shipped notifications to client and rep
// Triggered when order status changes to shipped
// (Called from controller, not scheduled)
// -------------------
export const sendShippedNotification = async (
  order: IClientOrder
): Promise<void> => {
  try {
    if (order.emailsSent.shippedNotification) return;

    const populatedOrder = await ClientOrder.findById(order._id)
      .populate({
        path: "client",
        populate: { path: "store", select: "name address city state zip" },
      })
      .populate("assignedRep", "name email");

    if (!populatedOrder) return;

    const client = populatedOrder.client as any;
    const rep = populatedOrder.assignedRep as any;
    const store = client?.store;

    if (!client || !rep || !store) return;

    // Send email to client
    const clientEmailSent = await sendOrderShippedEmail({
      clientName: store.name,
      contactEmail: client.contactEmail,
      orderNumber: populatedOrder.orderNumber,
      deliveryDate: formatDate(populatedOrder.deliveryDate),
      items: populatedOrder.items.map((item) => ({
        flavorName: item.flavorName,
        productType: item.productType,
        quantity: item.quantity,
      })),
      total: populatedOrder.total,
      repName: rep.name,
      repEmail: rep.email,
      shippingAddress: {
        name: store.name,
        address: store.address || "",
        city: store.city || "",
        state: store.state || "",
        zip: store.zip || "",
      },
      trackingNumber: populatedOrder.trackingNumber,
    });

    // Send email to rep
    const repEmailSent = await sendOrderShippedRepEmail({
      repEmail: rep.email,
      repName: rep.name,
      clientName: store.name,
      orderNumber: populatedOrder.orderNumber,
      deliveryDate: formatDate(populatedOrder.deliveryDate),
      total: populatedOrder.total,
      trackingNumber: populatedOrder.trackingNumber,
    });

    if (clientEmailSent && repEmailSent) {
      populatedOrder.emailsSent.shippedNotification = true;
      await populatedOrder.save();
    }
  } catch (err) {
    console.error("❌ Error sending shipped notification:", err);
  }
};

// -------------------
// Job 5: Create recurring order after shipment
// Called when an order is marked as shipped
// -------------------
export const createRecurringOrder = async (
  shippedOrder: IClientOrder
): Promise<IClientOrder | null> => {
  try {
    // Get the client to check recurring schedule
    const client = await PrivateLabelClient.findById(shippedOrder.client)
      .populate("store", "name")
      .populate("assignedRep", "name email");

    if (!client) {
      console.log("Client not found for recurring order");
      return null;
    }

    // Check if recurring is enabled
    if (!client.recurringSchedule.enabled) {
      console.log(
        `Recurring not enabled for client ${(client.store as any)?.name}`
      );
      return null;
    }

    // Calculate next delivery date based on interval
    const nextDeliveryDate = new Date(shippedOrder.deliveryDate);
    switch (client.recurringSchedule.interval) {
      case "monthly":
        nextDeliveryDate.setMonth(nextDeliveryDate.getMonth() + 1);
        break;
      case "bimonthly":
        nextDeliveryDate.setMonth(nextDeliveryDate.getMonth() + 2);
        break;
      case "quarterly":
        nextDeliveryDate.setMonth(nextDeliveryDate.getMonth() + 3);
        break;
      default:
        nextDeliveryDate.setMonth(nextDeliveryDate.getMonth() + 1);
    }

    // Calculate production start (2 weeks before delivery)
    const productionStartDate = new Date(nextDeliveryDate);
    productionStartDate.setDate(productionStartDate.getDate() - 14);

    // Create the new recurring order
    const newOrder = new ClientOrder({
      client: shippedOrder.client,
      assignedRep: shippedOrder.assignedRep,
      status: "waiting",
      deliveryDate: nextDeliveryDate,
      productionStartDate,
      items: shippedOrder.items.map((item) => ({
        label: item.label,
        flavorName: item.flavorName,
        productType: item.productType,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      })),
      subtotal: shippedOrder.subtotal,
      discount: shippedOrder.discount,
      discountType: shippedOrder.discountType,
      discountAmount: shippedOrder.discountAmount,
      total: shippedOrder.total,
      note: `Recurring order - Auto-generated from ${shippedOrder.orderNumber}`,
      isRecurring: true,
      parentOrder: shippedOrder._id,
      shipASAP: false,
    });

    await newOrder.save();

    console.log(
      `🔄 Recurring order ${newOrder.orderNumber} created from ${shippedOrder.orderNumber}`
    );

    // Notify the client (order created confirmation)
    await sendOrderCreatedNotification(newOrder, true);

    // Notify the rep
    const rep = client.assignedRep as any;
    if (rep?.email) {
      await sendRecurringOrderCreatedEmail({
        repEmail: rep.email,
        repName: rep.name,
        clientName: (client.store as any)?.name || "Unknown",
        orderNumber: newOrder.orderNumber,
        parentOrderNumber: shippedOrder.orderNumber,
        deliveryDate: formatDate(nextDeliveryDate),
        total: newOrder.total,
      });
    }

    return newOrder;
  } catch (err) {
    console.error("❌ Error creating recurring order:", err);
    return null;
  }
};

// -------------------
// Combined daily job runner
// -------------------
export const runDailyClientOrderJobs = async () => {
  console.log("⏰ Running daily client order jobs...");

  await autoPushOrdersToProduction();
  await sendSevenDayReminders();

  console.log("✅ Daily client order jobs complete");
};
