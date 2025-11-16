import { Request, Response } from "express";
import { Followup } from "../models/Followup";
import { Store } from "../models/Store";

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
export const getAllFollowups = async (req: Request, res: Response) => {
  try {
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
      if (!dateOnly) {
        return res.status(400).json({ message: "Invalid date format" });
      }
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
  } catch (error) {
    res.status(500).json({ message: "Error fetching followups", error });
  }
};

// ---------------------------------------------------------------------------
// GET FOLLOWUP BY ID
// ---------------------------------------------------------------------------
export const getFollowupById = async (req: Request, res: Response) => {
  try {
    const followup = await Followup.findById(req.params.id)
      .populate("store", "name address")
      .populate("rep", "name");

    if (!followup) {
      return res.status(404).json({ message: "Followup not found" });
    }

    res.json(followup);
  } catch (error) {
    res.status(500).json({ message: "Error fetching followup", error });
  }
};

// ---------------------------------------------------------------------------
// CREATE FOLLOWUP
// ---------------------------------------------------------------------------
export const createFollowup = async (req: Request, res: Response) => {
  try {
    let { followupDate, interestLevel, comments, store, rep } = req.body;

    // convert to YYYY-MM-DD
    const dateOnly = toDateOnlyString(followupDate);
    if (!dateOnly) {
      return res.status(400).json({ message: "Invalid followupDate" });
    }

    const newFollowup = await Followup.create({
      followupDate: dateOnly,
      interestLevel,
      comments,
      store,
      rep,
    });

    res.status(201).json(newFollowup);
  } catch (error) {
    res.status(500).json({ message: "Error creating followup", error });
  }
};

// ---------------------------------------------------------------------------
// UPDATE FOLLOWUP
// ---------------------------------------------------------------------------
export const updateFollowup = async (req: Request, res: Response) => {
  try {
    const updateData: any = { ...req.body };

    if (updateData.followupDate) {
      const dateOnly = toDateOnlyString(updateData.followupDate);
      if (!dateOnly) {
        return res.status(400).json({ message: "Invalid followupDate" });
      }
      updateData.followupDate = dateOnly;
    }

    const updated = await Followup.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Followup not found" });
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Error updating followup", error });
  }
};

// ---------------------------------------------------------------------------
// DELETE FOLLOWUP
// ---------------------------------------------------------------------------
export const deleteFollowup = async (req: Request, res: Response) => {
  try {
    const followup = await Followup.findByIdAndDelete(req.params.id);

    if (!followup) {
      return res.status(404).json({ message: "Followup not found" });
    }

    res.json({ message: "Followup deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting followup", error });
  }
};
