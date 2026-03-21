import { z } from "zod";

export const registerRepSchema = z.object({
  name: z.string().min(1, "Name is required"),
  loginName: z.string().min(2, "Login name must be at least 2 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  repType: z.enum(["rep", "delivery", "both", "pps"]).optional(),
  territory: z.string().optional(),
  email: z.string().email("Invalid email").optional(),
  phone: z.string().optional(),
});

export const loginRepSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});
