import mongoose, { Document, Schema } from 'mongoose';

export interface ISample extends Document {
  store: mongoose.Schema.Types.ObjectId;
  rep: mongoose.Schema.Types.ObjectId;
  status: 'in progress' | 'delivered';
  samples: {
    cannacrispy?: string;
    'holy water'?: string;
    'fifty one fifty': string;
    'bliss cannabis syrup'?: string;
  };
  notes?: string;
}

const SampleSchema: Schema = new Schema(
  {
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
    rep: { type: mongoose.Schema.Types.ObjectId, ref: 'Rep', required: true },
    status: {
      type: String,
      enum: ['in progress', 'delivered'],
      default: 'in progress',
    },
    samples: {
      cannacrispy: { type: String },
      'holy water': { type: String },
      'bliss cannabis syrup': { type: String },
      'fifty one fifty': {type: String}
    },
  },
  { timestamps: true }
);

export default mongoose.model<ISample>('Sample', SampleSchema);
