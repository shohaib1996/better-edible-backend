// src/controllers/mapOrdersController.ts
// Returns orders + samples with geocoded store coordinates for the map view.
// Also handles bulk-delivery creation from a circle selection.

import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { Order } from "../models/Order";
import Sample from "../models/Sample";
import { Store } from "../models/Store";
import { Delivery } from "../models/Delivery";
import { DeliveryOrder } from "../models/DeliveryOrder";

// ─── Geocode a store address via Google Maps Geocoding API ───────────────────
async function geocodeStore(store: any): Promise<{ lat: number; lng: number } | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return null;

  const parts = [store.address, store.city, store.state, store.zip].filter(Boolean);
  if (!parts.length) return null;

  const address = encodeURIComponent(parts.join(", "));
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${address}&key=${key}`;

  try {
    const res = await fetch(url);
    const data = (await res.json()) as any;
    if (data.status === "OK" && data.results?.[0]) {
      const { lat, lng } = data.results[0].geometry.location;
      return { lat, lng };
    }
  } catch {
    // silently fail — map will just skip this pin
  }
  return null;
}

// ─── GET /api/map-orders?date=YYYY-MM-DD&type=orders|samples|both ────────────
// Returns all active orders/samples with deliveryDate <= date, with store coords.
export const getMapOrders = asyncHandler(async (req, res) => {
  const { date, type = "both" } = req.query as { date?: string; type?: string };
  if (!date) throw new AppError("date query param is required (YYYY-MM-DD)", 400);

  const results: any[] = [];

  // ── Orders ──────────────────────────────────────────────────────────────────
  if (type === "orders" || type === "both") {
    const orders = await Order.find({
      status: { $in: ["submitted", "manifested"] },
      deliveryDate: { $lte: date },
    })
      .populate("store", "name address city state zip lat lng geocodedAt")
      .populate("rep", "name")
      .lean();

    for (const order of orders) {
      const storeDoc = order.store as any;
      if (!storeDoc) continue;

      // Geocode if missing or stale (> 30 days)
      let lat = storeDoc.lat;
      let lng = storeDoc.lng;
      const stale =
        !lat ||
        !lng ||
        !storeDoc.geocodedAt ||
        Date.now() - new Date(storeDoc.geocodedAt).getTime() > 30 * 24 * 60 * 60 * 1000;

      if (stale) {
        const coords = await geocodeStore(storeDoc);
        if (coords) {
          lat = coords.lat;
          lng = coords.lng;
          await Store.findByIdAndUpdate(storeDoc._id, {
            lat: coords.lat,
            lng: coords.lng,
            geocodedAt: new Date(),
          });
        }
      }

      if (!lat || !lng) continue; // skip stores we can't geocode

      results.push({
        type: "order",
        _id: order._id,
        orderNumber: (order as any).orderNumber,
        deliveryDate: order.deliveryDate,
        total: (order as any).total,
        store: {
          _id: storeDoc._id,
          name: storeDoc.name,
          address: storeDoc.address,
          city: storeDoc.city,
          state: storeDoc.state,
          lat,
          lng,
        },
        rep: order.rep,
      });
    }
  }

  // ── Samples ──────────────────────────────────────────────────────────────────
  if (type === "samples" || type === "both") {
    const samples = await Sample.find({
      status: { $in: ["submitted", "accepted", "manifested"] },
      deliveryDate: { $lte: date },
    })
      .populate("store", "name address city state zip lat lng geocodedAt")
      .populate("rep", "name")
      .lean();

    for (const sample of samples) {
      const storeDoc = sample.store as any;
      if (!storeDoc) continue;

      let lat = storeDoc.lat;
      let lng = storeDoc.lng;
      const stale =
        !lat ||
        !lng ||
        !storeDoc.geocodedAt ||
        Date.now() - new Date(storeDoc.geocodedAt).getTime() > 30 * 24 * 60 * 60 * 1000;

      if (stale) {
        const coords = await geocodeStore(storeDoc);
        if (coords) {
          lat = coords.lat;
          lng = coords.lng;
          await Store.findByIdAndUpdate(storeDoc._id, {
            lat: coords.lat,
            lng: coords.lng,
            geocodedAt: new Date(),
          });
        }
      }

      if (!lat || !lng) continue;

      results.push({
        type: "sample",
        _id: sample._id,
        deliveryDate: sample.deliveryDate,
        description: sample.description,
        store: {
          _id: storeDoc._id,
          name: storeDoc.name,
          address: storeDoc.address,
          city: storeDoc.city,
          state: storeDoc.state,
          lat,
          lng,
        },
        rep: sample.rep,
      });
    }
  }

  res.json({ results, total: results.length });
});

// ─── POST /api/map-orders/create-route ───────────────────────────────────────
// Body: { repId, scheduledAt, items: [{ type, _id, storeId }] }
// Creates one Delivery per item and saves the route order for the rep.
export const createRouteFromMap = asyncHandler(async (req, res) => {
  const { repId, scheduledAt, items } = req.body as {
    repId: string;
    scheduledAt: string; // ISO date string
    items: Array<{ type: "order" | "sample"; _id: string; storeId: string }>;
  };

  if (!repId) throw new AppError("repId is required", 400);
  if (!scheduledAt) throw new AppError("scheduledAt is required", 400);
  if (!items?.length) throw new AppError("items array is required", 400);

  const deliveries: any[] = [];
  const deliveryIds: string[] = [];

  for (const item of items) {
    const deliveryData: any = {
      storeId: item.storeId,
      assignedTo: repId,
      scheduledAt: new Date(scheduledAt),
      amount: 0,
      status: "in_transit",
      disposition: item.type === "sample" ? ["sample_drop"] : ["delivery"],
    };

    if (item.type === "order") {
      deliveryData.orderId = item._id;
      deliveryData.paymentAction = "collect_payment";
      // Update order status to manifested
      await Order.findByIdAndUpdate(item._id, { status: "manifested" });
    } else {
      deliveryData.sampleId = item._id;
      deliveryData.paymentAction = "no_payment";
      // Update sample status to manifested
      await Sample.findByIdAndUpdate(item._id, { status: "manifested" });
    }

    const delivery = await Delivery.create(deliveryData);
    deliveries.push(delivery);
    deliveryIds.push(String(delivery._id));
  }

  // Save route order for the rep (date key = YYYY-MM-DD)
  const dateKey = new Date(scheduledAt).toISOString().split("T")[0];
  await DeliveryOrder.findOneAndUpdate(
    { repId, date: dateKey },
    { order: deliveryIds },
    { new: true, upsert: true, runValidators: true }
  );

  res.status(201).json({
    message: `Route created: ${deliveries.length} deliveries`,
    deliveries,
    routeDate: dateKey,
  });
});
