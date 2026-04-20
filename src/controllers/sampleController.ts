import Sample from "../models/Sample";
import { Rep } from "../models/Rep";
import { Store } from "../models/Store";
import { Admin } from "../models/Admin";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";

export const createSample = asyncHandler(async (req, res) => {
  const { repId, storeId, description, notes, userId, userType } = req.body;

  // ✅ Validate Rep
  const rep = await Rep.findById(repId);
  if (!rep) throw new AppError("Rep not found", 404);

  // ✅ Validate Store
  const store = await Store.findById(storeId);
  if (!store) throw new AppError("Store not found", 404);
  if (store.blocked) throw new AppError("Store is blocked", 400);

  const sample = await Sample.create({
    rep: repId,
    store: storeId,
    description,
    notes,
    status: "submitted",
    ...(userId &&
      userType && {
        createdBy: { user: userId, userType },
      }),
  });

  res.status(201).json({
    message: "Sample created successfully",
    sample,
  });
});

export const updateSample = asyncHandler(async (req, res) => {
  // Normalize date fields to YYYY-MM-DD — if already correct format keep as-is,
  // otherwise parse using PST (app timezone) to avoid UTC day-shift
  const toDateStr = (val: string) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    return new Date(val).toLocaleDateString("en-CA", {
      timeZone: "America/Los_Angeles",
    });
  };
  if (req.body.deliveryDate) req.body.deliveryDate = toDateStr(req.body.deliveryDate);
  if (req.body.shippedDate) req.body.shippedDate = toDateStr(req.body.shippedDate);

  const sample = await Sample.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!sample) throw new AppError("Sample not found", 404);

  res.json({ message: "Sample updated successfully", sample });
});

export const updateSampleStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status) throw new AppError("Status is required", 400);

  const sample = await Sample.findByIdAndUpdate(req.params.id, { status }, { new: true });

  if (!sample) throw new AppError("Sample not found", 404);

  res.json({ message: `Sample status updated to ${status}`, sample });
});

export const getAllSamples = asyncHandler(async (req, res) => {
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
});

export const getSampleById = asyncHandler(async (req, res) => {
  const sample = await Sample.findById(req.params.id)
    .populate("rep", "name")
    .populate("store", "name");
  if (!sample) throw new AppError("Sample not found", 404);

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
});

export const deleteSample = asyncHandler(async (req, res) => {
  const sample = await Sample.findByIdAndDelete(req.params.id);
  if (!sample) throw new AppError("Sample not found", 404);
  res.json({ message: "Sample deleted successfully" });
});
