import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    text: { type: String, required: true, maxlength: 20000 },
    externalId: { type: String, default: '' },
    annotationCount: { type: Number, default: 0 },
    done: { type: Boolean, default: false },
  },
  { timestamps: true },
);

itemSchema.index({ project: 1, done: 1, _id: 1 });

export const Item = mongoose.model('Item', itemSchema);
