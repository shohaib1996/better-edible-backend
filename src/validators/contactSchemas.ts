import { z } from "zod";
import { objectId } from "./commonSchemas";

export const createContactSchema = z.union([
  // Single contact
  z.object({
    name: z.string().min(1, "Name is required"),
    store: objectId,
    role: z.string().optional(),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().optional(),
    importantToKnow: z.string().optional(),
  }),
  // Array of contacts
  z.array(z.object({
    name: z.string().min(1, "Name is required"),
    store: objectId,
    role: z.string().optional(),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().optional(),
    importantToKnow: z.string().optional(),
  })),
]);

export const updateContactSchema = z.object({
  name: z.string().min(1).optional(),
  store: objectId.optional(),
  role: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  importantToKnow: z.string().optional(),
});

export const getAllContactsQuery = z.object({
  storeId: z.string().optional(),
});
