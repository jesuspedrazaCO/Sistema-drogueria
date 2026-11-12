import mongoose from 'mongoose';

const { Schema } = mongoose;

const emptyToUndefined = (value) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

const supplierSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'El nombre del proveedor es obligatorio'],
      trim: true,
      maxlength: 120,
    },
    nit: { type: String, trim: true, maxlength: 20, set: emptyToUndefined },
    contactName: { type: String, trim: true, maxlength: 80 },
    phone: { type: String, trim: true, maxlength: 30 },
    email: { type: String, trim: true, lowercase: true, maxlength: 120 },
    address: { type: String, trim: true, maxlength: 160 },
    city: { type: String, trim: true, maxlength: 60 },
    // Días de crédito que otorga el proveedor (0 = contado)
    paymentTermsDays: { type: Number, min: 0, default: 0 },
    notes: { type: String, trim: true, maxlength: 500 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

supplierSchema.index({ nit: 1 }, { unique: true, sparse: true });
supplierSchema.index({ name: 1 });

export default mongoose.model('Supplier', supplierSchema);
