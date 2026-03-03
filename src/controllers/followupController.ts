import { Followup } from "../models/Followup";
import { Store } from "../models/Store";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";

/**
 * Convert any incoming date (string or Date) into YYYY-MM-DD string.
 * Returns null if invalid.
 */
function toDateOnlyString(
  input: string | Date | undefined | null
): string | null {
  if (!input) return null;

  // already correct format
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return input;
  }

  const d = new Date(input);
  if (isNaN(d.getTime())) return null;

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${y}-${m}-${day}`;
}

// ---------------------------------------------------------------------------
// GET ALL FOLLOWUPS
// ---------------------------------------------------------------------------
export const getAllFollowups = asyncHandler(async (req, res) => {
  const { storeId, repId, page = 1, limit = 20, storeName, date } = req.query;
  const query: any = {};

  if (storeId) query.store = storeId;
  if (repId) query.rep = repId;

  // Search by store name
  if (storeName) {
    const stores = await Store.find({
      name: { $regex: String(storeName), $options: "i" },
    });

    const storeIds = stores.map((s) => s._id);
    query.store = { $in: storeIds };
  }

  // Search by date (now stored as string "YYYY-MM-DD")
  if (date) {
    const dateOnly = toDateOnlyString(String(date));
    if (!dateOnly) throw new AppError("Invalid date format", 400);
    query.followupDate = dateOnly;
  }

  const followups = await Followup.find(query)
    .populate("store", "name address")
    .populate("rep", "name")
    .sort({ createdAt: -1 }) // 👈 Newest first
    .skip((+page - 1) * +limit)
    .limit(+limit);

  const total = await Followup.countDocuments(query);

  res.json({ total, page: +page, limit: +limit, followups });
});

// ---------------------------------------------------------------------------
// GET FOLLOWUP BY ID
// ---------------------------------------------------------------------------
export const getFollowupById = asyncHandler(async (req, res) => {
  const followup = await Followup.findById(req.params.id)
    .populate("store", "name address")
    .populate("rep", "name");

  if (!followup) throw new AppError("Followup not found", 404);

  res.json(followup);
});

// ---------------------------------------------------------------------------
// CREATE FOLLOWUP
// ---------------------------------------------------------------------------
export const createFollowup = asyncHandler(async (req, res) => {
  const { followupDate, interestLevel, comments, store, rep } = req.body;

  // convert to YYYY-MM-DD
  const dateOnly = toDateOnlyString(followupDate);
  if (!dateOnly) throw new AppError("Invalid followupDate", 400);

  const newFollowup = await Followup.create({
    followupDate: dateOnly,
    interestLevel,
    comments,
    store,
    rep,
  });

  res.status(201).json(newFollowup);
});

// ---------------------------------------------------------------------------
// UPDATE FOLLOWUP
// ---------------------------------------------------------------------------
export const updateFollowup = asyncHandler(async (req, res) => {
  const updateData: any = { ...req.body };

  if (updateData.followupDate) {
    const dateOnly = toDateOnlyString(updateData.followupDate);
    if (!dateOnly) throw new AppError("Invalid followupDate", 400);
    updateData.followupDate = dateOnly;
  }

  const updated = await Followup.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true }
  );

  if (!updated) throw new AppError("Followup not found", 404);

  res.json(updated);
});

// ---------------------------------------------------------------------------
// DELETE FOLLOWUP
// ---------------------------------------------------------------------------
export const deleteFollowup = asyncHandler(async (req, res) => {
  const followup = await Followup.findByIdAndDelete(req.params.id);

  if (!followup) throw new AppError("Followup not found", 404);

  res.json({ message: "Followup deleted successfully" });
});
