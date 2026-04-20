// src/controllers/authController.ts
import { Rep } from "../models/Rep";
import bcrypt from "bcryptjs";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";

// 🟩 Register Rep (basic)
export const registerRep = asyncHandler(async (req, res) => {
  const { name, loginName, password, repType, territory, email, phone } = req.body;

  const existing = await Rep.findOne({ loginName });
  if (existing) throw new AppError("Login name already exists", 400);

  const passwordHash = await bcrypt.hash(password, 10);
  const rep = await Rep.create({
    name,
    loginName,
    passwordHash,
    repType: repType || "rep",
    territory,
    email,
    phone,
    pin: "1212",
  });

  res.status(201).json({
    message: "Rep registered successfully",
    rep: {
      id: rep._id,
      name: rep.name,
      loginName: rep.loginName,
      repType: rep.repType,
      territory: rep.territory,
      email: rep.email,
      phone: rep.phone,
      pin: rep.pin,
    },
  });
});

// 🟦 Login Rep
export const loginRep = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const rep = await Rep.findOne({ email });

  if (!rep) throw new AppError("Rep not found", 404);

  const isMatch = await bcrypt.compare(password, rep.passwordHash);
  if (!isMatch) throw new AppError("Invalid credentials", 401);

  // No JWT yet — just send success and rep info
  res.status(200).json({
    message: "Login successful",
    rep: {
      id: rep._id,
      name: rep.name,
      loginName: rep.loginName,
      repType: rep.repType,
      territory: rep.territory,
      email: rep.email,
    },
  });
});

// 🟥 Logout (simple placeholder for now)
export const logoutRep = asyncHandler(async (_req, res) => {
  // In a simple setup, no token/session to invalidate
  res.status(200).json({ message: "Logout successful" });
});
