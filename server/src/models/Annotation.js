import mongoose from 'mongoose';

const annotationSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    label: { type: String, required: true },
  },
  { timestamps: true },
);

// One person can label an item only once.
annotationSchema.index({ item: 1, user: 1 }, { unique: true });
annotationSchema.index({ project: 1, user: 1 });

export const Annotation = mongoose.model('Annotation', annotationSchema);
