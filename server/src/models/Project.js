import mongoose from 'mongoose';

const labelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 40 },
    color: { type: String, default: '#0f766e' },
  },
  { _id: false },
);

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 500, default: '' },
    labels: {
      type: [labelSchema],
      validate: [(v) => v.length >= 2 && v.length <= 9, 'A project needs between 2 and 9 labels'],
    },
    // How many different annotators must label each item before it counts as done.
    annotationsPerItem: { type: Number, min: 1, max: 5, default: 2 },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true },
);

export const Project = mongoose.model('Project', projectSchema);
