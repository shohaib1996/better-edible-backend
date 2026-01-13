// src/models/Product.ts
import { Schema, model, Document, Types } from 'mongoose';

interface IHybridBreakdown {
  hybrid?: number;
  indica?: number;
  sativa?: number;
}

interface IPriceGroup {
  price: number;
  discountPrice?: number;
}

interface IPricesByType {
  hybrid?: IPriceGroup;
  indica?: IPriceGroup;
  sativa?: IPriceGroup;
}

interface IVariantPrice {
  label: string;
  price: number;
  discountPrice?: number;
}

export interface IProduct extends Document {
  productLine: Types.ObjectId | string; // Reference to ProductLine or legacy string
  subProductLine?: string;
  itemName?: string;
  hybridBreakdown?: IHybridBreakdown;
  prices?: IPricesByType;             // ✅ Unified price/discount system
  price?: number;
  discountPrice?: number;
  variants?: IVariantPrice[];
  priceDescription?: string;
  discountDescription?: string;
  applyDiscount?: boolean;
  active: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// 🔹 Subschemas
const HybridBreakdownSchema = new Schema<IHybridBreakdown>(
  {
    hybrid: Number,
    indica: Number,
    sativa: Number,
  },
  { _id: false }
);

const PriceGroupSchema = new Schema<IPriceGroup>(
  {
    price: Number,
    discountPrice: Number,
  },
  { _id: false }
);

const PricesByTypeSchema = new Schema<IPricesByType>(
  {
    hybrid: PriceGroupSchema,
    indica: PriceGroupSchema,
    sativa: PriceGroupSchema,
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

// 🔹 Main schema
const ProductSchema = new Schema<IProduct>(
  {
    productLine: {
      type: Schema.Types.ObjectId,
      ref: 'ProductLine',
      required: true
    },
    subProductLine: String,
    itemName: String,
    hybridBreakdown: HybridBreakdownSchema,
    prices: PricesByTypeSchema,       // ✅ Unified per-type pricing
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

ProductSchema.index({
  productLine: 'text',
  subProductLine: 'text',
  itemName: 'text',
});

export const Product = model<IProduct>('Product', ProductSchema);
