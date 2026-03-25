import mongoose, { Document, Schema, Types } from "mongoose";

export interface ILastPrintData {
  lotNumber: string;
  thcPercent: string;
  testDate: string;
}

export interface ILabelInventory extends Document {
  storeId: Types.ObjectId;
  storeName: string;
  labelId: Types.ObjectId;
  labelName: string;
  itemId: string;
  unprocessed: number;
  labeled: number;
  printed: number;
  reorderThreshold: number;
  lastPrintData?: ILastPrintData;
  createdAt: Date;
  updatedAt: Date;
}

const LastPrintDataSchema = new Schema<ILastPrintData>(
  {
    lotNumber: { type: String, required: true },
    thcPercent: { type: String, required: true },
    testDate: { type: String, required: true },
  },
  { _id: false }
);

const LabelInventorySchema = new Schema<ILabelInventory>(
  {
    storeId: { type: Schema.Types.ObjectId, ref: "Store", required: true },
    storeName: { type: String, required: true },
    labelId: { type: Schema.Types.ObjectId, ref: "Label", required: true },
    labelName: { type: String, required: true },
    itemId: { type: String, required: true },
    unprocessed: { type: Number, default: 0, min: 0 },
    labeled: { type: Number, default: 0, min: 0 },
    printed: { type: Number, default: 0, min: 0 },
    reorderThreshold: { type: Number, default: 0, min: 0 },
    lastPrintData: { type: LastPrintDataSchema },
  },
  { timestamps: true }
);

LabelInventorySchema.index({ storeId: 1, labelId: 1 }, { unique: true });
LabelInventorySchema.index({ storeName: 1, labelName: 1 });

export default mongoose.model<ILabelInventory>("LabelInventory", LabelInventorySchema);
