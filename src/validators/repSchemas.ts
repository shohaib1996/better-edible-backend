import { z } from "zod";
import { objectId } from "./commonSchemas";

export const checkInOutSchema = z.object({
  loginName: z.string().min(1, "Login name is required"),
  pin: z.string().min(1, "PIN is required"),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const resetPinSchema = z.object({
  pin: z.string().min(1, "PIN is required"),
});

export const updateRepSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  repType: z.enum(["rep", "delivery", "both", "pps", "production", "packaging"]).optional(),
  territory: z.string().optional(),
  status: z.enum(["active", "inactive", "suspended"]).optional(),
}).passthrough(); // allow other fields for flexibility
