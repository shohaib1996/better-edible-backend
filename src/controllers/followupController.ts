import { Followup } from "../models/Followup";
import { Store } from "../models/Store";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";

// ---------------------------------------------------------------------------
// Helper: normalise any date input to "YYYY-MM-DD" string
// ---------------------------------------------------------------------------
function toDateOnlyString(input: string | Date | undefined | null): string | null {
  if (!input) return null;
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  const d = new Date(input);
  if (isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ---------------------------------------------------------------------------
// GET ALL FOLLOWUPS  (admin view — all reps, filterable)
// ---------------------------------------------------------------------------
export const getAllFollowups = asyncHandler(async (req, res) => {
  const { storeId, repId, page = 1, limit = 20, storeName, date, status } = req.query;

  const query: any = {};
  if (storeId) query.store = storeId;
  if (repId) query.rep = repId;
  // default to showing open follow-ups; pass status=all to see everything
  if (status && status !== "all") query.status = status;
  else if (!status) query.status = "open";

  if (storeName) {
    const stores = await Store.find({ name: { $regex: String(storeName), $options: "i" } });
    query.store = { $in: stores.map((s) => s._id) };
  }

  if (date) {
    const dateOnly = toDateOnlyString(String(date));
    if (!dateOnly) throw new AppError("Invalid date format", 400);
    query.followupDate = dateOnly;
  }

  const followups = await Followup.find(query)
    .populate("store", "name address city state")
    .populate("rep", "name")
    .sort({ followupDate: 1, createdAt: -1 })
    .skip((+page - 1) * +limit)
    .limit(+limit);

  const total = await Followup.countDocuments(query);
  res.json({ total, page: +page, limit: +limit, followups });
});

// ---------------------------------------------------------------------------
// GET FOLLOWUPS FOR A REP  (rep view — bucketed by overdue/today/upcoming)
// ---------------------------------------------------------------------------
export const getRepFollowups = asyncHandler(async (req, res) => {
  const { repId } = req.params;
  const { status = "open" } = req.query;

  const followups = await Followup.find({ rep: repId, status })
    .populate("store", "name address city state")
    .sort({ followupDate: 1 });

  const today = toDateOnlyString(new Date())!;

  const overdue = followups.filter((f) => f.followupDate < today);
  const dueToday = followups.filter((f) => f.followupDate === today);
  const upcoming = followups.filter((f) => f.followupDate > today);

  res.json({ overdue, dueToday, upcoming, total: followups.length });
});

// ---------------------------------------------------------------------------
// GET FOLLOWUP BY ID
// ---------------------------------------------------------------------------
export const getFollowupById = asyncHandler(async (req, res) => {
  const followup = await Followup.findById(req.params.id)
    .populate("store", "name address city state")
    .populate("rep", "name");
  if (!followup) throw new AppError("Followup not found", 404);
  res.json(followup);
});

// ---------------------------------------------------------------------------
// CREATE FOLLOWUP  (one open per store enforced)
// ---------------------------------------------------------------------------
export const createFollowup = asyncHandler(async (req, res) => {
  const { followupDate, interestLevel, comments, store, rep, setByDriver, setByName } = req.body;

  const dateOnly = toDateOnlyString(followupDate);
  if (!dateOnly) throw new AppError("Invalid followupDate", 400);

  // Guard: one open follow-up per store
  const existing = await Followup.findOne({ store, status: "open" });
  if (existing) {
    throw new AppError(
      "This store already has an open follow-up. Resolve or reschedule it first.",
      409
    );
  }

  const newFollowup = await Followup.create({
    followupDate: dateOnly,
    interestLevel,
    comments: comments || "",
    store,
    rep,
    status: "open",
    setByDriver: !!setByDriver,
    setByName: setByDriver ? (setByName || undefined) : undefined,
    history: [
      {
        date: dateOnly,
        comments: comments || "",
        interestLevel,
        changedAt: new Date(),
        action: "created",
      },
    ],
  });

  res.status(201).json(newFollowup);
});

// ---------------------------------------------------------------------------
// RESCHEDULE FOLLOWUP  — extend the thread to a new date
// ---------------------------------------------------------------------------
export const rescheduleFollowup = asyncHandler(async (req, res) => {
  const { followupDate, interestLevel, comments } = req.body;

  const dateOnly = toDateOnlyString(followupDate);
  if (!dateOnly) throw new AppError("Invalid followupDate", 400);

  const followup = await Followup.findById(req.params.id);
  if (!followup) throw new AppError("Followup not found", 404);
  if (followup.status === "resolved") throw new AppError("Cannot reschedule a resolved follow-up", 400);

  followup.history.push({
    date: dateOnly,
    comments: comments !== undefined ? comments : followup.comments,
    interestLevel: interestLevel !== undefined ? interestLevel : followup.interestLevel,
    changedAt: new Date(),
    action: "rescheduled",
  });

  followup.followupDate = dateOnly;
  if (interestLevel !== undefined) followup.interestLevel = interestLevel;
  if (comments !== undefined) followup.comments = comments;

  await followup.save();
  res.json(followup);
});

// ---------------------------------------------------------------------------
// RESOLVE FOLLOWUP
// ---------------------------------------------------------------------------
export const resolveFollowup = asyncHandler(async (req, res) => {
  const { comments, interestLevel } = req.body;

  const followup = await Followup.findById(req.params.id);
  if (!followup) throw new AppError("Followup not found", 404);
  if (followup.status === "resolved") throw new AppError("Follow-up is already resolved", 400);

  followup.history.push({
    date: followup.followupDate,
    comments: comments !== undefined ? comments : followup.comments,
    interestLevel: interestLevel !== undefined ? interestLevel : followup.interestLevel,
    changedAt: new Date(),
    action: "resolved",
  });

  followup.status = "resolved";
  followup.resolvedAt = new Date();
  if (comments !== undefined) followup.comments = comments;
  if (interestLevel !== undefined) followup.interestLevel = interestLevel;

  await followup.save();
  res.json(followup);
});

// ---------------------------------------------------------------------------
// UPDATE FOLLOWUP  (general edit — kept for backwards compat)
// ---------------------------------------------------------------------------
export const updateFollowup = asyncHandler(async (req, res) => {
  const updateData: any = { ...req.body };
  if (updateData.followupDate) {
    const dateOnly = toDateOnlyString(updateData.followupDate);
    if (!dateOnly) throw new AppError("Invalid followupDate", 400);
    updateData.followupDate = dateOnly;
  }
  const updated = await Followup.findByIdAndUpdate(req.params.id, updateData, { new: true });
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
