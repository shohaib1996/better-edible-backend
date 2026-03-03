// src/controllers/adminAuthController.ts
import { Admin } from '../models/Admin';
import bcrypt from 'bcryptjs';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';

// 🟩 Register admin (only manually at first)
export const registerAdmin = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  const existing = await Admin.findOne({ email });
  if (existing) throw new AppError('Admin email already exists', 400);

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
});

// 🟦 Admin login
export const loginAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const admin = await Admin.findOne({ email });

  if (!admin) throw new AppError('Admin not found', 404);

  const isMatch = await bcrypt.compare(password, admin.passwordHash);
  if (!isMatch) throw new AppError('Invalid credentials', 401);

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
});

// 🟥 Admin logout (simple)
export const logoutAdmin = asyncHandler(async (_req, res) => { // eslint-disable-line @typescript-eslint/no-unused-vars
  res.status(200).json({ message: 'Logout successful' });
});
