import { z } from "zod";

export const createChainSchema = z.object({
  name: z.string().min(1, "Chain name is required"),
  buyingMode: z.enum(["central", "hybrid", "independent"]).default("independent"),
  notes: z.string().optional(),
  buyerName: z.string().optional(),
  buyerEmail: z.string().email().optional().or(z.literal("")),
  buyerPhone: z.string().optional(),
  billingContact: z.string().optional(),
});

export const updateChainSchema = createChainSchema.partial();
