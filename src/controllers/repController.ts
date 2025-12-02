// src/controllers/repController.ts
import { Request, Response } from "express";
import { Rep } from "../models/Rep";
import { TimeLog } from "../models/TimeLog";
import bcrypt from "bcryptjs";

// GET all reps
export const getAllReps = async (req: Request, res: Response) => {
  try {
    const reps = await Rep.find().populate("territory assignedStores");

    // 1. Get the total count
    const totalReps = reps.length;

    // 2. Send back a structured JSON response
    res.json({
      message: "All reps retrieved successfully.",
      totalReps: totalReps,
      data: reps, // Use a key like 'data' or 'reps' for the actual list
    });
  } catch (error) {
    // Keep the error handling for robustness
    res.status(500).json({ message: "Error fetching reps", error });
  }
};

// GET one rep
export const getRepById = async (req: Request, res: Response) => {
  try {
    const rep = await Rep.findById(req.params.id).populate(
      "territory assignedStores"
    );
    if (!rep) return res.status(404).json({ message: "Rep not found" });
    res.json(rep);
  } catch (error) {
    res.status(500).json({ message: "Error fetching rep", error });
  }
};

// CREATE rep
// export const createRep = async (req: Request, res: Response) => {
//   try {
//     const { name, loginName, password, repType, territory } = req.body;

//     const existing = await Rep.findOne({ loginName });
//     if (existing) return res.status(400).json({ message: 'Login name already taken' });

//     const hashedPassword = await bcrypt.hash(password, 10);
//     const rep = await Rep.create({
//       name,
//       loginName,
//       passwordHash: hashedPassword,
//       repType,
//       territory,
//     });

//     res.status(201).json(rep);
//   } catch (error) {
//     res.status(500).json({ message: 'Error creating rep', error });
//   }
// };

// UPDATE rep
export const updateRep = async (req: Request, res: Response) => {
  try {
    const rep = await Rep.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!rep) return res.status(404).json({ message: "Rep not found" });
    res.json(rep);
  } catch (error) {
    res.status(500).json({ message: "Error updating rep", error });
  }
};

// DELETE rep
export const deleteRep = async (req: Request, res: Response) => {
  try {
    const rep = await Rep.findByIdAndDelete(req.params.id);
    if (!rep) return res.status(404).json({ message: "Rep not found" });
    res.json({ message: "Rep deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting rep", error });
  }
};

// CHECK-IN / CHECK-OUT
// ✅ SECURE CHECK-IN
export const checkInRep = async (req: Request, res: Response) => {
  try {
    const { loginName, pin } = req.body; // ⬅️ loginName & pin in body

    // 1. Find rep by loginName
    const rep = await Rep.findOne({ loginName });
    if (!rep) {
      return res.status(404).json({ message: "Rep not found" });
    }

    // 2. Verify PIN
    if (rep.pin !== pin) {
      return res.status(401).json({ message: "Invalid PIN" });
    }

    // 3. Check rep status
    if (rep.status === "inactive" || rep.status === "suspended") {
      return res.status(403).json({
        message: `Check-in denied. You are ${rep.status} from the system.`,
      });
    }

    // 4. Already checked in?
    if (rep.checkin) {
      return res.status(400).json({ message: "You are already checked in." });
    }

    // 5. Update checkin flag and create time log
    rep.checkin = true;
    await rep.save();
    await TimeLog.create({ rep: rep._id, checkinTime: new Date() });

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
  } catch (error) {
    res.status(500).json({ message: "Error during check-in", error });
  }
};

// ✅ SECURE CHECK-OUT
export const checkOutRep = async (req: Request, res: Response) => {
  try {
    const { loginName, pin } = req.body;

    // 1. Find rep by loginName
    const rep = await Rep.findOne({ loginName });
    if (!rep) {
      return res.status(404).json({ message: "Rep not found" });
    }

    // 2. Verify PIN
    if (rep.pin !== pin) {
      return res.status(401).json({ message: "Invalid PIN" });
    }

    // 3. Check rep status
    if (rep.status === "inactive" || rep.status === "suspended") {
      return res.status(403).json({
        message: `Check-out denied. You are ${rep.status} from the system.`,
      });
    }

    // 4. Already checked out?
    if (!rep.checkin) {
      return res.status(400).json({ message: "You are already checked out." });
    }

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
  } catch (error) {
    res.status(500).json({ message: "Error during check-out", error });
  }
};

// RESET Password
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ message: "New password is required" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const rep = await Rep.findByIdAndUpdate(
      req.params.id,
      { passwordHash: hashedPassword },
      { new: true }
    );

    if (!rep) return res.status(404).json({ message: "Rep not found" });

    res.json({ message: "Password reset successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error resetting password", error });
  }
};

// RESET PIN
export const resetPin = async (req: Request, res: Response) => {
  try {
    const { pin } = req.body;
    if (!pin) {
      return res.status(400).json({ message: "New PIN is required" });
    }

    const rep = await Rep.findByIdAndUpdate(
      req.params.id,
      { pin: pin },
      { new: true }
    );

    if (!rep) return res.status(404).json({ message: "Rep not found" });

    res.json({ message: "PIN reset successfully", pin: rep.pin });
  } catch (error) {
    res.status(500).json({ message: "Error resetting PIN", error });
  }
};
