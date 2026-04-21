import { Schema, model, Document, Types } from "mongoose";

export type DesignRequestType = "free" | "paid" | "inhouse";
export type DesignRequestSource = "store" | "admin" | "rep";
export type DesignRequestQueue = "free" | "paid" | "inhouse";
export type DesignRequestStatus = "pending" | "in-progress" | "revision-requested" | "completed";
export type CommentAuthorRole = "store" | "designer" | "admin" | "rep";
export type DesignProductLine = "CannaCrispy" | "FiftyOneFifty" | "Bliss" | "YummyGummy";

export interface IComment {
  authorId: Types.ObjectId;
  authorName: string;
  authorRole: CommentAuthorRole;
  message: string;
  createdAt: Date;
}

export interface ICompletedFile {
  _id?: Types.ObjectId;
  url: string;
  fileName: string;
  uploadedAt: Date;
  sent: boolean;
  sentAt?: Date;
  version: number;
}

export interface IUploadedFile {
  url: string;
  fileName: string;
  uploadedAt: Date;
}

export interface IDesignRequest extends Document {
  requestId: string;
  requestType: DesignRequestType;
  source: DesignRequestSource;
  queueType: DesignRequestQueue;
  storeId?: Types.ObjectId;
  storeName?: string;
  contactId?: Types.ObjectId;
  submittedBy?: Types.ObjectId;
  submittedByName?: string;
  productLine?: DesignProductLine | null;
  description: string;
  uploadedFiles: IUploadedFile[];
  completedFiles: ICompletedFile[];
  comments: IComment[];
  revisionCount: number;
  status: DesignRequestStatus;
  assignedDesigner?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<IComment>(
  {
    authorId: { type: Schema.Types.ObjectId, required: true },
    authorName: { type: String, required: true },
    authorRole: { type: String, enum: ["store", "designer", "admin", "rep"], required: true },
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const CompletedFileSchema = new Schema<ICompletedFile>(
  {
    url: { type: String, required: true },
    fileName: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
    sent: { type: Boolean, default: false },
    sentAt: { type: Date },
    version: { type: Number, required: true },
  },
  { _id: true }
);

const UploadedFileSchema = new Schema<IUploadedFile>(
  {
    url: { type: String, required: true },
    fileName: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const DesignRequestSchema = new Schema<IDesignRequest>(
  {
    requestId: { type: String, unique: true, required: true },
    requestType: { type: String, enum: ["free", "paid", "inhouse"], required: true },
    source: { type: String, enum: ["store", "admin", "rep"], required: true },
    queueType: { type: String, enum: ["free", "paid", "inhouse"], required: true },
    storeId: { type: Schema.Types.ObjectId, ref: "Store" },
    storeName: { type: String },
    contactId: { type: Schema.Types.ObjectId, ref: "Contact" },
    submittedBy: { type: Schema.Types.ObjectId },
    submittedByName: { type: String },
    productLine: {
      type: String,
      enum: ["CannaCrispy", "FiftyOneFifty", "Bliss", "YummyGummy"],
      default: null,
    },
    description: { type: String, required: true },
    uploadedFiles: [UploadedFileSchema],
    completedFiles: [CompletedFileSchema],
    comments: [CommentSchema],
    revisionCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["pending", "in-progress", "revision-requested", "completed"],
      default: "pending",
    },
    assignedDesigner: { type: Schema.Types.ObjectId, ref: "Rep" },
  },
  { timestamps: true }
);

export const DesignRequest = model<IDesignRequest>("DesignRequest", DesignRequestSchema);
