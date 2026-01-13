// src/models/ProductLine.ts
import { Schema, model, Document } from 'mongoose';

// Field types for dynamic form generation
export type FieldType = 'text' | 'number' | 'select' | 'textarea';

export interface IFieldConfig {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required?: boolean;
  options?: string[]; // For select fields
}

// Pricing structure types
export type PricingStructureType = 'simple' | 'variants' | 'multi-type';

export interface IPricingStructure {
  type: PricingStructureType;
  // For 'simple': just uses price/discountPrice (Fifty-One Fifty)
  // For 'variants': uses variant labels array (BLISS Cannabis Syrup)
  variantLabels?: string[];
  // For 'multi-type': uses type labels array (Cannacrispy: hybrid/indica/sativa)
  typeLabels?: string[];
}

export interface IProductLine extends Document {
  name: string; // e.g., "Cannacrispy", "Fifty-One Fifty"
  displayOrder: number; // For sorting
  active: boolean;

  // Pricing configuration
  pricingStructure: IPricingStructure;

  // Dynamic fields configuration
  // These define what fields appear in the product form
  fields: IFieldConfig[];

  // Display configuration
  description?: string;

  createdAt: Date;
  updatedAt: Date;
}

const FieldConfigSchema = new Schema<IFieldConfig>(
  {
    name: { type: String, required: true },
    label: { type: String, required: true },
    type: { type: String, enum: ['text', 'number', 'select', 'textarea'], required: true },
    placeholder: String,
    required: { type: Boolean, default: false },
    options: [String],
  },
  { _id: false }
);

const PricingStructureSchema = new Schema<IPricingStructure>(
  {
    type: {
      type: String,
      enum: ['simple', 'variants', 'multi-type'],
      required: true
    },
    variantLabels: [String],
    typeLabels: [String],
  },
  { _id: false }
);

const ProductLineSchema = new Schema<IProductLine>(
  {
    name: { type: String, required: true, unique: true },
    displayOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    pricingStructure: { type: PricingStructureSchema, required: true },
    fields: [FieldConfigSchema],
    description: String,
  },
  { timestamps: true }
);

ProductLineSchema.index({ name: 1 });
ProductLineSchema.index({ displayOrder: 1 });

export const ProductLine = model<IProductLine>('ProductLine', ProductLineSchema);
