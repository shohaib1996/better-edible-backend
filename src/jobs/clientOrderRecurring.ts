import { ClientOrder, IClientOrder } from "../models/ClientOrder";
import { PrivateLabelClient } from "../models/PrivateLabelClient";
import { sendRecurringOrderCreatedEmail } from "../services/email";
import { sendOrderCreatedNotification, delay, formatDate } from "./clientOrderNotifications";

export const createRecurringOrder = async (
  shippedOrder: IClientOrder
): Promise<IClientOrder | null> => {
  try {
    const client = await PrivateLabelClient.findById(shippedOrder.client)
      .populate("store", "name")
      .populate("assignedRep", "name email");

    if (!client) {
      console.log("Client not found for recurring order");
      return null;
    }

    if (!client.recurringSchedule.enabled) {
      console.log(`Recurring not enabled for client ${(client.store as any)?.name}`);
      return null;
    }

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

    const productionStartDate = new Date(nextDeliveryDate);
    productionStartDate.setDate(productionStartDate.getDate() - 14);

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

    await sendOrderCreatedNotification(newOrder, true);

    await delay(600);

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
