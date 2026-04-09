import mongoose from "mongoose";

/** Shared aggregation stages for populating createdBy (admin or rep) */
export const createdByLookupStages = [
  {
    $lookup: {
      from: "admins",
      localField: "createdBy.user",
      foreignField: "_id",
      as: "_createdByAdmin",
    },
  },
  {
    $lookup: {
      from: "reps",
      localField: "createdBy.user",
      foreignField: "_id",
      as: "_createdByRep",
    },
  },
  {
    $addFields: {
      createdBy: {
        $cond: {
          if: { $gt: [{ $size: { $ifNull: ["$_createdByAdmin", []] } }, 0] },
          then: {
            user: { $arrayElemAt: ["$_createdByAdmin", 0] },
            userType: "admin",
          },
          else: {
            $cond: {
              if: { $gt: [{ $size: { $ifNull: ["$_createdByRep", []] } }, 0] },
              then: {
                user: { $arrayElemAt: ["$_createdByRep", 0] },
                userType: "rep",
              },
              else: null,
            },
          },
        },
      },
    },
  },
];

/** Lookup stages for store and rep */
export const storeRepLookupStages = [
  {
    $lookup: {
      from: "stores",
      localField: "store",
      foreignField: "_id",
      as: "store",
    },
  },
  { $unwind: { path: "$store", preserveNullAndEmptyArrays: true } },
  {
    $lookup: {
      from: "reps",
      localField: "rep",
      foreignField: "_id",
      as: "rep",
    },
  },
  { $unwind: { path: "$rep", preserveNullAndEmptyArrays: true } },
];

/** Lookup + merge items.product with productLine populated */
export const productLookupStages = [
  {
    $lookup: {
      from: "products",
      localField: "items.product",
      foreignField: "_id",
      as: "_products",
      pipeline: [
        {
          $lookup: {
            from: "productlines",
            localField: "productLine",
            foreignField: "_id",
            as: "_productLine",
          },
        },
        {
          $addFields: {
            productLine: { $arrayElemAt: ["$_productLine", 0] },
          },
        },
        { $unset: "_productLine" },
        {
          $project: {
            _id: 1,
            productLine: { _id: 1, name: 1 },
            subProductLine: 1,
            itemName: 1,
          },
        },
      ],
    },
  },
  {
    $addFields: {
      items: {
        $map: {
          input: "$items",
          as: "item",
          in: {
            $mergeObjects: [
              "$$item",
              {
                product: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$_products",
                        as: "p",
                        cond: { $eq: ["$$p._id", "$$item.product"] },
                      },
                    },
                    0,
                  ],
                },
              },
            ],
          },
        },
      },
    },
  },
  { $unset: "_products" },
];

/** Build the match stage for orders/samples queries */
export function buildMatchStage(query: any) {
  const { status, storeId, repId, startDate, endDate } = query;
  const matchStage: any = {};

  if (status && typeof status === "string") {
    matchStage.status = { $in: status.split(",") };
  }
  if (storeId && mongoose.Types.ObjectId.isValid(String(storeId))) {
    matchStage.store = new mongoose.Types.ObjectId(String(storeId));
  }
  if (repId && mongoose.Types.ObjectId.isValid(String(repId))) {
    matchStage.rep = new mongoose.Types.ObjectId(String(repId));
  }

  if (startDate && endDate) {
    const startStr = String(startDate);
    const endStr = String(endDate);
    const startDate_ = new Date(startStr);
    startDate_.setUTCHours(0, 0, 0, 0);
    const endDate_ = new Date(endStr);
    endDate_.setUTCHours(23, 59, 59, 999);

    const statuses = typeof status === "string" ? status.split(",") : [];
    const isShippedFilter =
      statuses.length > 0 && statuses.every((s) => s === "shipped" || s === "cancelled");

    if (isShippedFilter) {
      matchStage.$or = [
        { shippedDate: { $gte: startStr, $lte: endStr } },
        { shippedDate: { $exists: false }, deliveryDate: { $gte: startStr, $lte: endStr } },
        { shippedDate: { $exists: false }, deliveryDate: { $gte: startDate_, $lte: endDate_ } },
      ];
    } else {
      matchStage.$or = [
        { deliveryDate: { $gte: startStr, $lte: endStr } },
        { deliveryDate: { $gte: startDate_, $lte: endDate_ } },
      ];
    }
  }

  return matchStage;
}
