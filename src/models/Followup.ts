import { Schema, model, Document, Types } from "mongoose";

export type FollowupStatus = "open" | "resolved";

export interface IFollowupHistoryEntry {
  date: string;          // YYYY-MM-DD — the date this entry was the active followup date
  comments: string;
  interestLevel?: string;
  changedAt: Date;       // when the rep rescheduled or resolved
  action: "created" | "rescheduled" | "resolved";
}

export interface IFollowup extends Document {
  followupDate: string;       // YYYY-MM-DD — current target date
  interestLevel?: string;
  comments: string;
  store: Types.ObjectId;
  rep: Types.ObjectId;
  status: FollowupStatus;     // "open" | "resolved"
  resolvedAt?: Date;
  history: IFollowupHistoryEntry[];  // full thread of past dates/notes
  setByDriver?: boolean;      // true when a driver created this on behalf of the rep
  setByName?: string;         // name of the driver who set it
  createdAt: Date;
  updatedAt: Date;
}

const HistoryEntrySchema = new Schema<IFollowupHistoryEntry>(
  {
    date: { type: String, required: true },
    comments: { type: String, default: "" },
    interestLevel: { type: String },
    changedAt: { type: Date, default: () => new Date() },
    action: {
      type: String,
      enum: ["created", "rescheduled", "resolved"],
      required: true,
    },
  },
  { _id: false }
);

const FollowupSchema = new Schema<IFollowup>(
  {
    followupDate: {
      type: String,
      required: true,
      validate: {
        validator: (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v),
        message: (prop: any) => `${prop.value} is not a valid YYYY-MM-DD date`,
      },
    },
    interestLevel: { type: String },
    comments: { type: String, default: "" },
    store: { type: Schema.Types.ObjectId, ref: "Store", required: true },
    rep: { type: Schema.Types.ObjectId, ref: "Rep", required: true },
    status: {
      type: String,
      enum: ["open", "resolved"],
      default: "open",
    },
    resolvedAt: { type: Date },
    history: { type: [HistoryEntrySchema], default: [] },
    setByDriver: { type: Boolean, default: false },
    setByName: { type: String },
  },
  { timestamps: true }
);

// One active follow-up per store (only enforced for open ones)
FollowupSchema.index(
  { store: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "open" },
    name: "one_open_per_store",
  }
);

export const Followup = model<IFollowup>("Followup", FollowupSchema);
