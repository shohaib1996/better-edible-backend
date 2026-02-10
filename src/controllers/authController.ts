// src/controllers/authController.ts
import { Request, Response } from "express";
import { Rep } from "../models/Rep";
import bcrypt from "bcryptjs";

// 🟩 Register Rep (basic)
export const registerRep = async (req: Request, res: Response) => {
  try {
    const { name, loginName, password, repType, territory, email, phone } =
      req.body;

    const existing = await Rep.findOne({ loginName });
    if (existing)
      return res.status(400).json({ message: "Login name already exists" });

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
  } catch (error) {
    res.status(500).json({ message: "Error registering rep", error });
  }
};

// 🟦 Login Rep
export const loginRep = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const rep = await Rep.findOne({ email });

    if (!rep) return res.status(404).json({ message: "Rep not found" });

    const isMatch = await bcrypt.compare(password, rep.passwordHash);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

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
  } catch (error) {
    res.status(500).json({ message: "Error during login", error });
  }
};

// 🟥 Logout (simple placeholder for now)
export const logoutRep = async (req: Request, res: Response) => {
  try {
    // In a simple setup, no token/session to invalidate
    res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    res.status(500).json({ message: "Error during logout", error });
  }
};
