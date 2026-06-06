import { ClientOrder } from "../../models/ClientOrder";
import { CookItem } from "../../models/CookItem";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../utils/AppError";

// PATCH /api/client-orders/:id/push-to-pps
export const pushOrderToPPS = asyncHandler(async (req, res) => {
  const order = await ClientOrder.findById(req.params.id)
    .populate({
      path: "items.label",
      select: "flavorName productType flavorComponents colorComponents itemId",
    })
    .populate({ path: "client", populate: { path: "store", select: "name storeId _id" } });

  if (!order) throw new AppError("Order not found", 404);

  if (order.status !== "waiting") {
    throw new AppError("Order is not in waiting status", 400);
  }

  const storeMongoId = (order.client as any)?.store?._id;
  const storeId = (order.client as any)?.store?.storeId;
  const storeName = (order.client as any)?.store?.name;

  if (!storeMongoId || !storeId || !storeName) {
    throw new AppError("Order client/store data is missing", 400);
  }

  const normalizedOrderNumber = (order.orderNumber as string).replace("-", "");

  const cookItemDocs = order.items.map((item: any) => {
    const label = item.label as any;
    const labelId = String(label._id);
    if (!label.itemId) {
      throw new AppError(
        `Label itemId missing for label ${labelId} — run backfillLabelItemIds script`,
        400
      );
    }
    return {
      cookItemId: `${storeId}-${normalizedOrderNumber}-${label.itemId}`,
      customerId: storeMongoId,
      orderId: order.orderNumber,
      itemId: labelId,
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

  order.status = "cooking_molding";
  await order.save();

  import("../../jobs/clientOrderJobs").then(({ sendProductionStartedNotification }) => {
    sendProductionStartedNotification(order);
  });

  res.json({
    message: "Order pushed to production",
    cookItemsCreated: cookItemDocs.length,
    order,
  });
});
