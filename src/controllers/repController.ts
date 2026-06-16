// src/controllers/repController.ts
import { Rep } from "../models/Rep";
import { Store } from "../models/Store";
import { TimeLog } from "../models/TimeLog";
import bcrypt from "bcryptjs";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";

// GET all reps
export const getAllReps = asyncHandler(async (_req, res) => {
  const reps = await Rep.find().populate("territory assignedStores");

  // 1. Get the total count
  const totalReps = reps.length;

  // 2. Add storeCount to each rep by counting from Store collection
  const repsWithStoreCount = await Promise.all(
    reps.map(async (rep) => {
      const storeCount = await Store.countDocuments({ rep: rep._id });
      return {
        ...rep.toObject(),
        storeCount,
      };
    })
  );

  // 3. Send back a structured JSON response
  res.json({
    message: "All reps retrieved successfully.",
    totalReps: totalReps,
    data: repsWithStoreCount,
  });
});

// GET one rep
export const getRepById = asyncHandler(async (req, res) => {
  const rep = await Rep.findById(req.params.id).populate("territory assignedStores");
  if (!rep) throw new AppError("Rep not found", 404);
  res.json(rep);
});

// UPDATE rep
export const updateRep = asyncHandler(async (req, res) => {
  const rep = await Rep.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  if (!rep) throw new AppError("Rep not found", 404);
  res.json(rep);
});

// DELETE rep
export const deleteRep = asyncHandler(async (req, res) => {
  const rep = await Rep.findByIdAndDelete(req.params.id);
  if (!rep) throw new AppError("Rep not found", 404);
  res.json({ message: "Rep deleted successfully" });
});

// ─────────────────────────────────────────────────────────────────
// KIOSK CLOCK — single endpoint that handles check-in AND check-out
// Accepts either { pin } or { fobId } (no loginName required for kiosk)
// source is always "door"
// ─────────────────────────────────────────────────────────────────
export const kioskClock = asyncHandler(async (req, res) => {
  const { pin, fobId } = req.body;

  if (!pin && !fobId) {
    throw new AppError("PIN or fob ID is required", 400);
  }

  // Find rep by fob or by PIN (PIN is unique per rep, used as fallback)
  let rep;
  if (fobId) {
    rep = await Rep.findOne({ fobId: fobId.trim() });
    if (!rep) throw new AppError("Fob not recognized", 404);
  } else {
    // PIN-only fallback: PIN must be unique across all reps for kiosk use
    const matches = await Rep.find({ pin });
    if (matches.length === 0) throw new AppError("Invalid PIN", 401);
    if (matches.length > 1) throw new AppError("PIN is not unique — contact admin", 400);
    rep = matches[0];
  }

  if (rep.status === "inactive" || rep.status === "suspended") {
    throw new AppError(`Access denied. You are ${rep.status}.`, 403);
  }

  if (!rep.checkin) {
    // Clock IN
    rep.checkin = true;
    await rep.save();
    await TimeLog.create({ rep: rep._id, checkinTime: new Date(), source: "door" });
    return res.json({
      action: "checkin",
      message: `Welcome, ${rep.name}!`,
      rep: { id: rep._id, name: rep.name, repType: rep.repType, checkin: true },
    });
  } else {
    // Clock OUT
    rep.checkin = false;
    await rep.save();
    const timeLog = await TimeLog.findOne({ rep: rep._id, checkoutTime: null });
    if (timeLog) {
      timeLog.checkoutTime = new Date();
      await timeLog.save();
    }
    return res.json({
      action: "checkout",
      message: `Goodbye, ${rep.name}!`,
      rep: { id: rep._id, name: rep.name, checkin: false },
    });
  }
});

// CHECK-IN / CHECK-OUT (existing web/mobile flows — now with source tagging)
// ✅ SECURE CHECK-IN
export const checkInRep = asyncHandler(async (req, res) => {
  const { loginName, pin, source = "web" } = req.body;

  // 1. Find rep by loginName
  const rep = await Rep.findOne({ loginName });
  if (!rep) throw new AppError("Rep not found", 404);

  // 2. Verify PIN
  if (rep.pin !== pin) throw new AppError("Invalid PIN", 401);

  // 3. Check rep status
  if (rep.status === "inactive" || rep.status === "suspended") {
    throw new AppError(`Check-in denied. You are ${rep.status} from the system.`, 403);
  }

  // 4. Already checked in?
  if (rep.checkin) throw new AppError("You are already checked in.", 400);

  // 5. Update checkin flag and create time log
  rep.checkin = true;
  await rep.save();
  await TimeLog.create({ rep: rep._id, checkinTime: new Date(), source });

  res.json({
    message: "Checked in successfully",
    rep: {
      id: rep._id,
      name: rep.name,
      loginName: rep.loginName,
      repType: rep.repType,
      checkin: rep.checkin,
    },
  });
});

// ✅ SECURE CHECK-OUT
export const checkOutRep = asyncHandler(async (req, res) => {
  const { loginName, pin, source = "web" } = req.body;

  // 1. Find rep by loginName
  const rep = await Rep.findOne({ loginName });
  if (!rep) throw new AppError("Rep not found", 404);

  // 2. Verify PIN
  if (rep.pin !== pin) throw new AppError("Invalid PIN", 401);

  // 3. Check rep status
  if (rep.status === "inactive" || rep.status === "suspended") {
    throw new AppError(`Check-out denied. You are ${rep.status} from the system.`, 403);
  }

  // 4. Already checked out?
  if (!rep.checkin) throw new AppError("You are already checked out.", 400);

  // 5. Update checkin flag and time log
  rep.checkin = false;
  await rep.save();
  const timeLog = await TimeLog.findOne({ rep: rep._id, checkoutTime: null });
  if (timeLog) {
    timeLog.checkoutTime = new Date();
    await timeLog.save();
  }

  res.json({
    message: "Checked out successfully",
    rep: {
      id: rep._id,
      name: rep.name,
      loginName: rep.loginName,
      checkin: rep.checkin,
    },
  });
});

// RESET Password
export const resetPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;
  if (!password) throw new AppError("New password is required", 400);

  const hashedPassword = await bcrypt.hash(password, 10);
  const rep = await Rep.findByIdAndUpdate(
    req.params.id,
    { passwordHash: hashedPassword },
    { new: true }
  );

  if (!rep) throw new AppError("Rep not found", 404);

  res.json({ message: "Password reset successfully" });
});

// RESET PIN
export const resetPin = asyncHandler(async (req, res) => {
  const { pin } = req.body;
  if (!pin) throw new AppError("New PIN is required", 400);

  const rep = await Rep.findByIdAndUpdate(req.params.id, { pin: pin }, { new: true });

  if (!rep) throw new AppError("Rep not found", 404);

  res.json({ message: "PIN reset successfully", pin: rep.pin });
});

// ASSIGN FOB to rep
export const assignFob = asyncHandler(async (req, res) => {
  const { fobId } = req.body;

  // Check if fobId is already assigned to another rep
  if (fobId) {
    const existing = await Rep.findOne({ fobId: fobId.trim(), _id: { $ne: req.params.id } });
    if (existing) {
      throw new AppError(`Fob is already assigned to ${existing.name}`, 400);
    }
  }

  const rep = await Rep.findByIdAndUpdate(
    req.params.id,
    { fobId: fobId ? fobId.trim() : null },
    { new: true }
  );

  if (!rep) throw new AppError("Rep not found", 404);

  res.json({ message: fobId ? "Fob assigned successfully" : "Fob removed", rep });
});
