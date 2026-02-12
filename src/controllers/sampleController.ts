import { Request, Response } from "express";
import Sample from "../models/Sample";
import { Rep } from "../models/Rep";
import { Store } from "../models/Store";
import { Admin } from "../models/Admin";

export const createSample = async (req: Request, res: Response) => {
  try {
    const { repId, storeId, description, notes, userId, userType } = req.body;

    // ✅ Validate Rep
    const rep = await Rep.findById(repId);
    if (!rep) return res.status(404).json({ message: "Rep not found" });

    // ✅ Validate Store
    const store = await Store.findById(storeId);
    if (!store) return res.status(404).json({ message: "Store not found" });
    if (store.blocked)
      return res.status(400).json({ message: "Store is blocked" });

    const sample = await Sample.create({
      rep: repId,
      store: storeId,
      description,
      notes,
      status: "submitted",
      ...(userId && userType && {
        createdBy: { user: userId, userType },
      }),
    });

    res.status(201).json({
      message: "Sample created successfully",
      sample,
    });
  } catch (error: any) {
    console.error("Error creating sample:", error);
    res.status(500).json({
      message: "Error creating sample",
      error: error.message,
    });
  }
};

export const updateSample = async (req: Request, res: Response) => {
  try {
    const sample = await Sample.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!sample) return res.status(404).json({ message: "Sample not found" });

    res.json({ message: "Sample updated successfully", sample });
  } catch (error) {
    console.error("Error updating sample:", error);
    res.status(500).json({ message: "Error updating sample", error });
  }
};

export const updateSampleStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: "Status is required" });

    const sample = await Sample.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!sample) return res.status(404).json({ message: "Sample not found" });

    res.json({ message: `Sample status updated to ${status}`, sample });
  } catch (error) {
    console.error("Error updating sample status:", error);
    res.status(500).json({ message: "Error updating sample status", error });
  }
};

export const getAllSamples = async (req: Request, res: Response) => {
  try {
    const { repId, page = 1, limit = 20, search, status } = req.query;
    const query: any = {};
    if (repId) {
      query.rep = repId;
    }
    if (status) {
      query.status = status;
    }

    if (search) {
      const stores = await Store.find({
        name: { $regex: search, $options: "i" },
      }).select("_id");
      const storeIds = stores.map((store) => store._id);
      query.store = { $in: storeIds };
    }

    const [rawSamples, total] = await Promise.all([
      Sample.find(query)
        .populate("rep", "name")
        .populate("store", "name address")
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .sort({ status: -1, createdAt: -1 })
        .lean(),
      Sample.countDocuments(query),
    ]);

    // Populate createdBy.user from the correct collection
    const samples = await Promise.all(
      rawSamples.map(async (sample: any) => {
        if (sample.createdBy?.user && sample.createdBy?.userType) {
          const creator =
            sample.createdBy.userType === "admin"
              ? await Admin.findById(sample.createdBy.user).select("name").lean()
              : await Rep.findById(sample.createdBy.user).select("name").lean();
          if (creator) {
            sample.createdBy = {
              user: { _id: creator._id, name: creator.name },
              userType: sample.createdBy.userType,
            };
          }
        }
        return sample;
      })
    );

    res.json({
      total,
      page: Number(page),
      limit: Number(limit),
      samples,
    });
  } catch (error) {
    console.error("Error fetching samples:", error);
    res.status(500).json({ message: "Error fetching samples", error });
  }
};

export const getSampleById = async (req: Request, res: Response) => {
  try {
    const sample = await Sample.findById(req.params.id)
      .populate("rep", "name")
      .populate("store", "name");
    if (!sample) return res.status(404).json({ message: "Sample not found" });

    // Populate createdBy.user from the correct collection
    if (sample.createdBy?.user && sample.createdBy?.userType) {
      const creator =
        sample.createdBy.userType === "admin"
          ? await Admin.findById(sample.createdBy.user).select("name").lean()
          : await Rep.findById(sample.createdBy.user).select("name").lean();
      if (creator) {
        (sample as any).createdBy = {
          user: { _id: creator._id, name: creator.name },
          userType: sample.createdBy.userType,
        };
      }
    }

    res.json(sample);
  } catch (error) {
    console.error("Error fetching sample:", error);
    res.status(500).json({ message: "Error fetching sample", error });
  }
};

export const deleteSample = async (req: Request, res: Response) => {
  try {
    const sample = await Sample.findByIdAndDelete(req.params.id);
    if (!sample) return res.status(404).json({ message: "Sample not found" });
    res.json({ message: "Sample deleted successfully" });
  } catch (error) {
    console.error("Error deleting sample:", error);
    res.status(500).json({ message: "Error deleting sample", error });
  }
};
