import { Schema, model, Document, Types } from "mongoose";

// ─────────────────────────────
// TYPES
// ─────────────────────────────

export type CookItemStatus =
  | "pending"
  | "in-progress"
  | "cooking_molding_complete"
  | "dehydrating_complete"
  | "demolding_complete"
  | "bagging"
  | "sealing"
  | "bag_seal_complete"
  | "packaging_casing_complete";

// ─────────────────────────────
// SUB-INTERFACES
// ─────────────────────────────

export interface IFormulationComponent {
  name: string;
  percentage: number;
}

export interface IMoldingTimestamp {
  moldId: string;
  unitsPerMold: number;
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

export interface IHistoryEntry {
  action: string;
  performedBy: { userId: string; userName: string; repType: string };
  detail?: string;
  timestamp: Date;
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

  // Cooking & Molding Stage Data
  assignedMoldIds: string[];
  cookingMoldingStartTimestamp?: Date;
  cookingMoldingCompletionTimestamp?: Date;
  moldingTimestamps: IMoldingTimestamp[];

  // Dehydrating Stage Data
  dehydratorTrayIds: string[];
  dehydratorAssignments: IDehydratorAssignment[];
  dehydratingCompletionTimestamp?: Date;

  // Demolding Stage Data
  trayRemovalTimestamps: ITrayRemoval[];
  containerPackedTimestamp?: Date;
  labelPrintTimestamp?: Date;
  demoldingCompletionTimestamp?: Date;

  // Oil Usage (Stage 1)
  oilContainerId?: string;
  oilCalculatedAmount?: number;
  oilActualAmount?: number;

  // Flavor & Color (Stage 1 — cook entry)
  flavorIds: string[];
  flavorAmounts: { flavorId: string; amountGrams: number }[];
  colorIds: string[];
  colorAmounts: { colorId: string; amountGrams: number }[];
  flavorColorSetAt?: Date;
  flavorColorSetBy?: { userId: string; userName: string };
  flavorColorEditHistory: {
    editedBy: { userId: string; userName: string };
    editedAt: Date;
    note?: string;
  }[];

  // Bag & Seal Stage Data
  baggingStartTimestamp?: Date;
  sealingStartTimestamp?: Date;

  // Packaging & Casing Stage Data
  packagingStartTimestamp?: Date;
  expectedCount: number;
  actualCount?: number;
  countVariance?: number;
  fullCases?: number;
  partialCaseCount?: number;
  totalCases?: number;
  caseIds: string[];
  packagingCompletionTimestamp?: Date;

  history: IHistoryEntry[];

  createdAt: Date;
  updatedAt: Date;
}

// ─────────────────────────────
// SUB-SCHEMAS
// ─────────────────────────────

const FlavorAmountSchema = new Schema(
  {
    flavorId: { type: String, required: true },
    amountGrams: { type: Number, required: true },
  },
  { _id: false }
);

const ColorAmountSchema = new Schema(
  {
    colorId: { type: String, required: true },
    amountGrams: { type: Number, required: true },
  },
  { _id: false }
);

const FlavorColorEditSchema = new Schema(
  {
    editedBy: {
      userId: { type: String, required: true },
      userName: { type: String, required: true },
    },
    editedAt: { type: Date, required: true },
    note: { type: String },
  },
  { _id: false }
);

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
    unitsPerMold: { type: Number, required: true, default: 70 },
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

const HistoryEntrySchema = new Schema<IHistoryEntry>(
  {
    action: { type: String, required: true },
    performedBy: {
      userId: { type: String, required: true },
      userName: { type: String, required: true },
      repType: { type: String, required: true },
    },
    detail: { type: String },
    timestamp: { type: Date, required: true },
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
        "cooking_molding_complete",
        "dehydrating_complete",
        "demolding_complete",
        "bagging",
        "sealing",
        "bag_seal_complete",
        "packaging_casing_complete",
      ],
      default: "pending",
    },

    // Cooking & Molding Stage Data
    assignedMoldIds: { type: [String], default: [] },
    cookingMoldingStartTimestamp: Date,
    cookingMoldingCompletionTimestamp: Date,
    moldingTimestamps: { type: [MoldingTimestampSchema], default: [] },

    // Dehydrating Stage Data
    dehydratorTrayIds: { type: [String], default: [] },
    dehydratorAssignments: { type: [DehydratorAssignmentSchema], default: [] },
    dehydratingCompletionTimestamp: Date,

    // Demolding Stage Data
    trayRemovalTimestamps: { type: [TrayRemovalSchema], default: [] },
    containerPackedTimestamp: Date,
    labelPrintTimestamp: Date,
    demoldingCompletionTimestamp: Date,

    // Oil Usage (Stage 1)
    oilContainerId: { type: String },
    oilCalculatedAmount: { type: Number },
    oilActualAmount: { type: Number },

    // Flavor & Color (Stage 1 — cook entry)
    flavorIds: { type: [String], default: [] },
    flavorAmounts: { type: [FlavorAmountSchema], default: [] },
    colorIds: { type: [String], default: [] },
    colorAmounts: { type: [ColorAmountSchema], default: [] },
    flavorColorSetAt: Date,
    flavorColorSetBy: {
      type: new Schema({ userId: { type: String }, userName: { type: String } }, { _id: false }),
    },
    flavorColorEditHistory: { type: [FlavorColorEditSchema], default: [] },

    // Bag & Seal Stage Data
    baggingStartTimestamp: Date,
    sealingStartTimestamp: Date,

    // Packaging & Casing Stage Data
    packagingStartTimestamp: Date,
    expectedCount: { type: Number, default: 0 },
    actualCount: Number,
    countVariance: Number,
    fullCases: Number,
    partialCaseCount: Number,
    totalCases: Number,
    caseIds: { type: [String], default: [] },
    packagingCompletionTimestamp: Date,

    history: { type: [HistoryEntrySchema], default: [] },
  },
  { timestamps: true }
);

// ─────────────────────────────
// INDEXES
// ─────────────────────────────

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
