// src/models/Product.ts
import { Schema, model, Document } from 'mongoose';

interface IHybridBreakdown {
  hybrid?: number;
  indica?: number;
  sativa?: number;
}

interface IVariantPrice {
  label: string; // e.g., "100Mg", "300Mg", "1000Mg"
  price: number;
  discountPrice?: number;
}

export interface IProduct extends Document {
  productLine: string; // e.g. "Cannacrispy", "Fifty-One Fifty", "BLISS Cannabis Syrup"
  subProductLine?: string; // e.g. "Original", "Chocolate", "Mango"
  itemName?: string; // specific product under the line
  hybridBreakdown?: IHybridBreakdown; // used only for Cannacrispy
  price?: number; // used for Fifty-One Fifty single item price
  discountPrice?: number; // optional discount
  variants?: IVariantPrice[]; // used for BLISS syrup’s 100mg/300mg/1000mg
  priceDescription?: string;
  discountDescription?: string;
  applyDiscount?: boolean;
  active: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const HybridBreakdownSchema = new Schema<IHybridBreakdown>(
  {
    hybrid: Number,
    indica: Number,
    sativa: Number,
  },
  { _id: false }
);

const VariantPriceSchema = new Schema<IVariantPrice>(
  {
    label: { type: String, required: true },
    price: { type: Number, required: true },
    discountPrice: Number,
  },
  { _id: false }
);

const ProductSchema = new Schema<IProduct>(
  {
    productLine: { type: String, required: true },
    subProductLine: String,
    itemName: String,
    hybridBreakdown: HybridBreakdownSchema,
    price: Number,
    discountPrice: Number,
    variants: [VariantPriceSchema],
    priceDescription: String,
    discountDescription: String,
    applyDiscount: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    metadata: Schema.Types.Mixed,
  },
  { timestamps: true }
);

ProductSchema.index({ productLine: 'text', subProductLine: 'text', itemName: 'text' });

export const Product = model<IProduct>('Product', ProductSchema);
