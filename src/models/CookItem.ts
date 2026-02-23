import { Schema, model, Document, Types } from "mongoose";

// ─────────────────────────────
// TYPES
// ─────────────────────────────

export type CookItemStatus =
  | "pending"
  | "in-progress"
  | "stage_1_complete"
  | "stage_2_complete"
  | "stage_3_complete"
  | "stage_4_complete";

// ─────────────────────────────
// SUB-INTERFACES
// ─────────────────────────────

export interface IFormulationComponent {
  name: string;
  percentage: number;
}

export interface IMoldingTimestamp {
  moldId: string;
  startTimestamp: Date;
  completionTimestamp?: Date;
}

export interface IDehydratorAssignment {
  moldId: string;
  trayId: string;
  dehydratorUnitId: string;
  shelfPosition: number;
  loadTimestamp: Date;
  expectedEndTime: Date;
}

export interface ITrayRemoval {
  trayId: string;
  removalTimestamp: Date;
}

// ─────────────────────────────
// MAIN INTERFACE
// ─────────────────────────────

export interface ICookItem extends Document {
  cookItemId: string;
  customerId: Types.ObjectId;
  orderId: string;
  itemId: string;
  labelId: Types.ObjectId;
  privateLabOrderId: Types.ObjectId;

  // Display Info
  storeName: string;
  flavor: string;
  quantity: number;
  flavorComponents: IFormulationComponent[];
  colorComponents: IFormulationComponent[];
  productType: string;
  specialFormulation: boolean;

  // Status
  status: CookItemStatus;

  // Stage 1 Data
  assignedMoldIds: string[];
  stage1StartTimestamp?: Date;
  stage1CompletionTimestamp?: Date;
  moldingTimestamps: IMoldingTimestamp[];

  // Stage 2 Data
  dehydratorTrayIds: string[];
  dehydratorAssignments: IDehydratorAssignment[];
  stage2CompletionTimestamp?: Date;

  // Stage 3 Data
  trayRemovalTimestamps: ITrayRemoval[];
  containerPackedTimestamp?: Date;
  labelPrintTimestamp?: Date;
  stage3CompletionTimestamp?: Date;

  // Stage 4 Data
  packagingStartTimestamp?: Date;
  expectedCount: number;
  actualCount?: number;
  countVariance?: number;
  fullCases?: number;
  partialCaseCount?: number;
  totalCases?: number;
  caseIds: string[];
  packagingCompletionTimestamp?: Date;

  createdAt: Date;
  updatedAt: Date;
}

// ─────────────────────────────
// SUB-SCHEMAS
// ─────────────────────────────

const FormulationComponentSchema = new Schema<IFormulationComponent>(
  {
    name: { type: String, required: true },
    percentage: { type: Number, required: true },
  },
  { _id: false }
);

const MoldingTimestampSchema = new Schema<IMoldingTimestamp>(
  {
    moldId: { type: String, required: true },
    startTimestamp: { type: Date, required: true },
    completionTimestamp: Date,
  },
  { _id: false }
);

const DehydratorAssignmentSchema = new Schema<IDehydratorAssignment>(
  {
    moldId: { type: String, required: true },
    trayId: { type: String, required: true },
    dehydratorUnitId: { type: String, required: true },
    shelfPosition: { type: Number, required: true },
    loadTimestamp: { type: Date, required: true },
    expectedEndTime: { type: Date, required: true },
  },
  { _id: false }
);

const TrayRemovalSchema = new Schema<ITrayRemoval>(
  {
    trayId: { type: String, required: true },
    removalTimestamp: { type: Date, required: true },
  },
  { _id: false }
);

// ─────────────────────────────
// MAIN SCHEMA
// ─────────────────────────────

const CookItemSchema = new Schema<ICookItem>(
  {
    cookItemId: { type: String, required: true, unique: true },
    customerId: { type: Schema.Types.ObjectId, required: true },
    orderId: { type: String, required: true },
    itemId: { type: String, required: true },
    labelId: { type: Schema.Types.ObjectId, ref: "Label", required: true },
    privateLabOrderId: { type: Schema.Types.ObjectId, ref: "ClientOrder", required: true },

    // Display Info
    storeName: { type: String, required: true },
    flavor: { type: String, required: true },
    quantity: { type: Number, required: true },
    flavorComponents: { type: [FormulationComponentSchema], default: [] },
    colorComponents: { type: [FormulationComponentSchema], default: [] },
    productType: { type: String, required: true },
    specialFormulation: { type: Boolean, default: false },

    // Status
    status: {
      type: String,
      enum: [
        "pending",
        "in-progress",
        "stage_1_complete",
        "stage_2_complete",
        "stage_3_complete",
        "stage_4_complete",
      ],
      default: "pending",
    },

    // Stage 1 Data
    assignedMoldIds: { type: [String], default: [] },
    stage1StartTimestamp: Date,
    stage1CompletionTimestamp: Date,
    moldingTimestamps: { type: [MoldingTimestampSchema], default: [] },

    // Stage 2 Data
    dehydratorTrayIds: { type: [String], default: [] },
    dehydratorAssignments: { type: [DehydratorAssignmentSchema], default: [] },
    stage2CompletionTimestamp: Date,

    // Stage 3 Data
    trayRemovalTimestamps: { type: [TrayRemovalSchema], default: [] },
    containerPackedTimestamp: Date,
    labelPrintTimestamp: Date,
    stage3CompletionTimestamp: Date,

    // Stage 4 Data
    packagingStartTimestamp: Date,
    expectedCount: { type: Number, default: 0 },
    actualCount: Number,
    countVariance: Number,
    fullCases: Number,
    partialCaseCount: Number,
    totalCases: Number,
    caseIds: { type: [String], default: [] },
    packagingCompletionTimestamp: Date,
  },
  { timestamps: true }
);

// ─────────────────────────────
// INDEXES
// ─────────────────────────────

CookItemSchema.index({ cookItemId: 1 }, { unique: true });
CookItemSchema.index({ status: 1 });
CookItemSchema.index({ orderId: 1 });
CookItemSchema.index({ customerId: 1 });
CookItemSchema.index({ privateLabOrderId: 1 });
CookItemSchema.index({ labelId: 1 });
CookItemSchema.index({ createdAt: 1 });

// ─────────────────────────────
// EXPORT
// ─────────────────────────────

export const CookItem = model<ICookItem>("CookItem", CookItemSchema);
