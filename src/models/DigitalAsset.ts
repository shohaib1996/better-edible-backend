import { Schema, model, Document, Types } from "mongoose";

export type AssetCategory =
  | "Banner"
  | "ProductImage"
  | "Video"
  | "Email"
  | "Flyer"
  | "Social"
  | "Text"
  | "Other";
export type AssetProductLine = "CannaCrispy" | "FiftyOneFifty" | "Bliss" | "YummyGummy";
export type AssetType = "file" | "text";
export type AssetStatus = "active" | "archived";

export interface IDigitalAsset extends Document {
  title: string;
  description?: string;
  category: AssetCategory;
  productLine?: AssetProductLine | null;
  assetType: AssetType;
  fileUrl?: string;
  previewUrl?: string;
  textContent?: string;
  tags: string[];
  status: AssetStatus;
  uploadedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DigitalAssetSchema = new Schema<IDigitalAsset>(
  {
    title: { type: String, required: true },
    description: { type: String },
    category: {
      type: String,
      enum: ["Banner", "ProductImage", "Video", "Email", "Flyer", "Social", "Text", "Other"],
      required: true,
    },
    productLine: {
      type: String,
      enum: ["CannaCrispy", "FiftyOneFifty", "Bliss", "YummyGummy"],
      default: null,
    },
    assetType: { type: String, enum: ["file", "text"], required: true },
    fileUrl: { type: String },
    previewUrl: { type: String },
    textContent: { type: String },
    tags: [{ type: String }],
    status: { type: String, enum: ["active", "archived"], default: "active" },
    uploadedBy: { type: Schema.Types.ObjectId, refPath: "uploadedByModel" },
  },
  { timestamps: true }
);

export const DigitalAsset = model<IDigitalAsset>("DigitalAsset", DigitalAssetSchema);
