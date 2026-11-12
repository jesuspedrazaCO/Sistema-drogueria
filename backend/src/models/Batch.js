import mongoose from 'mongoose';
import { moneyField, integerValidator } from '../utils/modelHelpers.js';

const { Schema } = mongoose;

const DAY_MS = 24 * 60 * 60 * 1000;

// Un lote existe solo para productos de droguería (con control de vencimiento).
// Convención: expirationDate se guarda al final del día de vencimiento (UTC); si el
// empaque dice "06/2027", el validador de la API lo normaliza al último día de ese mes.
const batchSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    batchNumber: {
      type: String,
      required: [true, 'El número de lote es obligatorio'],
      trim: true,
      uppercase: true,
      maxlength: 40,
    },
    expirationDate: { type: Date, required: [true, 'La fecha de vencimiento es obligatoria'] },
    manufacturingDate: { type: Date },

    quantityReceived: {
      type: Number,
      required: true,
      min: [1, 'La cantidad recibida debe ser al menos 1'],
      validate: integerValidator,
    },
    quantityAvailable: {
      type: Number,
      required: true,
      min: [0, 'La cantidad disponible no puede ser negativa'],
      validate: integerValidator,
    },
    unitCost: moneyField(), // costo unitario sin IVA

    supplier: { type: Schema.Types.ObjectId, ref: 'Supplier' },
    purchase: { type: Schema.Types.ObjectId, ref: 'Purchase' },
    receivedAt: { type: Date, default: Date.now },

    // Bloqueo manual (retiro del mercado, cuarentena): no se vende aunque tenga stock
    isBlocked: { type: Boolean, default: false },
    blockedReason: { type: String, trim: true, maxlength: 200 },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

batchSchema.virtual('isExpired').get(function () {
  return this.expirationDate.getTime() < Date.now();
});

batchSchema.virtual('daysToExpire').get(function () {
  return Math.ceil((this.expirationDate.getTime() - Date.now()) / DAY_MS);
});

batchSchema.pre('validate', function () {
  if (
    this.manufacturingDate &&
    this.expirationDate &&
    this.manufacturingDate >= this.expirationDate
  ) {
    this.invalidate('manufacturingDate', 'La fabricación debe ser anterior al vencimiento');
  }
});

batchSchema.index({ product: 1, batchNumber: 1 }, { unique: true });
// FEFO: primero el lote que vence antes, solo entre los que tienen existencias
batchSchema.index(
  { product: 1, expirationDate: 1 },
  { partialFilterExpression: { quantityAvailable: { $gt: 0 } } }
);
// Alertas de vencimiento
batchSchema.index(
  { expirationDate: 1 },
  { partialFilterExpression: { quantityAvailable: { $gt: 0 } } }
);

export default mongoose.model('Batch', batchSchema);
