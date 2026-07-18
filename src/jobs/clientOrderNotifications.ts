import { ClientOrder, IClientOrder } from "../models/ClientOrder";
import {
  sendSevenDayReminderEmail,
  sendReadyToShipEmail,
  sendOrderShippedEmail,
  sendOrderShippedRepEmail,
  sendOrderCreatedClientEmail,
  sendOrderInProductionEmail,
} from "../services/email";

export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const formatDate = (date: Date): string => {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

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

export const sendProductionStartedNotification = async (order: IClientOrder): Promise<void> => {
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

export const sendReadyToShipNotification = async (order: IClientOrder): Promise<void> => {
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

export const sendShippedNotification = async (order: IClientOrder): Promise<void> => {
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

    await delay(600);

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

export const sendSevenDayReminders = async () => {
  try {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 7);
    targetDate.setHours(0, 0, 0, 0);

    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const orders = await ClientOrder.find({
      status: { $in: ["cooking_molding", "dehydrating", "demolding", "packaging_casing"] },
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
