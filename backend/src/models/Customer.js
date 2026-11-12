import mongoose from 'mongoose';
import { DOCUMENT_TYPES } from '../config/constants.js';

const { Schema } = mongoose;

const emptyToUndefined = (value) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

const customerSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'El nombre del cliente es obligatorio'],
      trim: true,
      maxlength: 120,
    },
    documentType: { type: String, enum: DOCUMENT_TYPES, default: 'CC' },
    documentNumber: { type: String, trim: true, maxlength: 30, set: emptyToUndefined },
    phone: { type: String, trim: true, maxlength: 30 },
    email: { type: String, trim: true, lowercase: true, maxlength: 120 },
    address: { type: String, trim: true, maxlength: 160 },
    notes: { type: String, trim: true, maxlength: 500 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

customerSchema.index(
  { documentType: 1, documentNumber: 1 },
  { unique: true, partialFilterExpression: { documentNumber: { $type: 'string' } } }
);
customerSchema.index({ name: 1 });

export default mongoose.model('Customer', customerSchema);
