// src/controllers/adminAuthController.ts
import { Request, Response } from 'express';
import { Admin } from '../models/Admin';
import bcrypt from 'bcryptjs';

// 🟩 Register admin (only manually at first)
export const registerAdmin = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;

    const existing = await Admin.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Admin email already exists' });

    const passwordHash = await bcrypt.hash(password, 10);

    const admin = await Admin.create({
      name,
      email,
      passwordHash,
      role: role || 'superadmin',
    });

    res.status(201).json({
      message: 'Admin registered successfully',
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error registering admin', error });
  }
};

// 🟦 Admin login
export const loginAdmin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });

    if (!admin) return res.status(404).json({ message: 'Admin not found' });

    const isMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    // For now, return success + admin info (no JWT yet)
    res.status(200).json({
      message: 'Login successful',
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error during admin login', error });
  }
};

// 🟥 Admin logout (simple)
export const logoutAdmin = async (req: Request, res: Response) => {
  try {
    res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    res.status(500).json({ message: 'Error during logout', error });
  }
};
