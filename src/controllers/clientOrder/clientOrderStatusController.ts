import { ClientOrder } from "../../models/ClientOrder";
import { CookItem } from "../../models/CookItem";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../utils/AppError";

// PATCH /api/client-orders/:id/status
export const updateClientOrderStatus = asyncHandler(async (req, res) => {
  const order = await ClientOrder.findById(req.params.id);
  if (!order) throw new AppError("Order not found", 404);

  const { status, trackingNumber } = req.body;

  const validStatuses = [
    "waiting",
    "cooking_molding",
    "dehydrating",
    "demolding",
    "packaging_casing",
    "ready_to_ship",
    "shipped",
  ];

  if (!validStatuses.includes(status)) throw new AppError("Invalid status", 400);

  const previousStatus = order.status;

  const productionStatuses = [
    "cooking_molding",
    "dehydrating",
    "demolding",
    "packaging_casing",
    "ready_to_ship",
  ];

  if (status === "waiting" && productionStatuses.includes(previousStatus)) {
    throw new AppError("Cannot revert order to waiting once production has started", 400);
  }

  if (status === "waiting" && previousStatus !== "waiting") {
    await CookItem.deleteMany({ privateLabOrderId: order._id });
  }

  // When setting status to cooking_molding, create CookItems if none exist.
  // Covers both: waiting → cooking_molding, and re-selecting cooking_molding on a stuck order.
  if (status === "cooking_molding") {
    const existing = await CookItem.countDocuments({ privateLabOrderId: order._id });
    if (existing === 0) {
      const populated = await ClientOrder.findById(order._id)
        .populate({
          path: "items.label",
          select: "flavorName productType flavorComponents colorComponents itemId",
        })
        .populate({ path: "client", populate: { path: "store", select: "name storeId _id" } });

      const storeId = (populated?.client as any)?.store?.storeId;
      const storeName = (populated?.client as any)?.store?.name;
      const storeMongoId = (populated?.client as any)?.store?._id;

      if (storeId && storeName && storeMongoId && populated) {
        const normalizedOrderNumber = (order.orderNumber as string).replace("-", "");
        const cookItemDocs = (populated.items as any[]).map((item: any) => {
          const label = item.label as any;
          return {
            cookItemId: `${storeId}-${normalizedOrderNumber}-${label.itemId}`,
            customerId: storeMongoId,
            orderId: order.orderNumber,
            itemId: String(label._id),
            labelId: label._id,
            privateLabOrderId: order._id,
            storeName,
            flavor: label.flavorName,
            quantity: item.quantity,
            flavorComponents: label.flavorComponents || [],
            colorComponents: label.colorComponents || [],
            productType: label.productType,
            specialFormulation: false,
            status: "pending",
            expectedCount: item.quantity,
          };
        });
        await CookItem.insertMany(cookItemDocs);
      }
    }
  }

  order.status = status;

  if (status === "cooking_molding" && previousStatus !== "cooking_molding") {
    await order.save();
    import("../../jobs/clientOrderJobs").then(({ sendProductionStartedNotification }) => {
      sendProductionStartedNotification(order);
    });
  } else if (status === "ready_to_ship" && previousStatus !== "ready_to_ship") {
    await order.save();
    import("../../jobs/clientOrderJobs").then(({ sendReadyToShipNotification }) => {
      sendReadyToShipNotification(order);
    });
  } else if (status === "shipped") {
    order.actualShipDate = new Date();
    if (trackingNumber) order.trackingNumber = trackingNumber;
    await order.save();
    import("../../jobs/clientOrderJobs").then(
      async ({ sendShippedNotification, createRecurringOrder }) => {
        await sendShippedNotification(order);
        await createRecurringOrder(order);
      }
    );
  } else {
    await order.save();
  }

  res.json({ message: `Order status updated to ${status}`, order });
});

// PATCH /api/client-orders/:id/delivery-date
export const updateDeliveryDate = asyncHandler(async (req, res) => {
  const order = await ClientOrder.findById(req.params.id);
  if (!order) throw new AppError("Order not found", 404);

  const { deliveryDate } = req.body;
  if (!deliveryDate) throw new AppError("Delivery date is required", 400);

  order.deliveryDate = new Date(deliveryDate);

  if (order.status === "waiting") order.calculateProductionStart();

  await order.save();

  res.json({ message: "Delivery date updated successfully", order });
});

// PATCH /api/client-orders/:id/ship-asap
export const toggleShipASAP = asyncHandler(async (req, res) => {
  const order = await ClientOrder.findById(req.params.id);
  if (!order) throw new AppError("Order not found", 404);

  const { shipASAP } = req.body;
  order.shipASAP = shipASAP !== undefined ? shipASAP : !order.shipASAP;
  await order.save();

  res.json({
    message: order.shipASAP ? "Order marked for immediate shipping" : "Ship ASAP disabled",
    order,
  });
});

// PATCH /api/client-orders/:id/complete-production
export const completeProductionCallback = asyncHandler(async (req, res) => {
  const order = await ClientOrder.findById(req.params.id);
  if (!order) throw new AppError("Order not found", 404);

  order.status = "ready_to_ship";
  await order.save();

  import("../../jobs/clientOrderJobs").then(({ sendReadyToShipNotification }) => {
    sendReadyToShipNotification(order);
  });

  res.json({ success: true, order });
});
