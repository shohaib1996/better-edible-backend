// src/models/Product.ts
import { Schema, model, Document, Types } from "mongoose";

interface IHybridBreakdown {
  [key: string]: number | undefined;
}

interface IPriceGroup {
  price: number;
  discountPrice?: number;
}

interface IPricesByType {
  [key: string]: IPriceGroup | undefined;
}

interface IVariantPrice {
  label: string;
  price: number;
  discountPrice?: number;
}

interface IProductImage {
  url: string;
  publicId: string;
}

export interface IProduct extends Document {
  productLine: Types.ObjectId | string;
  subProductLine?: string;
  itemName?: string;
  hybridBreakdown?: IHybridBreakdown;
  prices?: IPricesByType;
  price?: number;
  discountPrice?: number;
  variants?: IVariantPrice[];
  priceDescription?: string;
  discountDescription?: string;
  applyDiscount?: boolean;
  active: boolean;
  metadata?: Record<string, any>;
  images?: IProductImage[];
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

// 🔹 Subschemas
const PriceGroupSchema = new Schema<IPriceGroup>(
  {
    price: Number,
    discountPrice: Number,
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
      ref: "ProductLine",
      required: true,
    },
    subProductLine: String,
    itemName: String,
    hybridBreakdown: { type: Schema.Types.Mixed, default: undefined },
    prices: { type: Schema.Types.Mixed, default: undefined },
    price: Number,
    discountPrice: Number,
    variants: [VariantPriceSchema],
    priceDescription: String,
    discountDescription: String,
    applyDiscount: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    metadata: Schema.Types.Mixed,
    images: {
      type: [{ url: { type: String, required: true }, publicId: { type: String, required: true } }],
      default: [],
      _id: false,
    },
    displayOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ProductSchema.index({
  productLine: "text",
  subProductLine: "text",
  itemName: "text",
});

export const Product = model<IProduct>("Product", ProductSchema);
