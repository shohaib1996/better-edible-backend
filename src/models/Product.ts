// src/models/Product.ts
import { Schema, model, Document } from 'mongoose';

interface IPriceTier {
  label: string;         // e.g. "Unit", "Box", "Carton"
  price: number;
  discountPrice?: number;
}

export interface IProduct extends Document {
  name: string;
  productLine?: string;  // e.g. "Snacks"
  subProductLine?: string; // e.g. "Chips"
  sku?: string;
  description?: string;
  priceTiers: IPriceTier[];
  active: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const PriceTierSchema = new Schema<IPriceTier>(
  {
    label: { type: String, required: true },
    price: { type: Number, required: true },
    discountPrice: Number,
  },
  { _id: false }
);

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    productLine: String,
    subProductLine: String,
    sku: { type: String, index: true },
    description: String,
    priceTiers: { type: [PriceTierSchema], default: [] },
    active: { type: Boolean, default: true },
    metadata: Schema.Types.Mixed,
  },
  { timestamps: true }
);

// helpful indexes for search
ProductSchema.index({ name: 'text', productLine: 'text', subProductLine: 'text' });

export const Product = model<IProduct>('Product', ProductSchema);
