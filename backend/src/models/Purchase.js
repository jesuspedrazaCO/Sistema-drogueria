import mongoose from 'mongoose';
import {
  PURCHASE_PAYMENT_METHODS,
  SUPPLIER_PAYMENT_METHODS,
  PAYMENT_STATUS,
  PURCHASE_STATUS,
} from '../config/constants.js';
import { moneyField, integerValidator, ivaValidator } from '../utils/modelHelpers.js';

const { Schema } = mongoose;

// En compras, unitCost va SIN IVA y el IVA se suma (así viene en la factura del proveedor).
const purchaseItemSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  // Obligatorios solo para productos de droguería; lo valida el servicio (ferretería no usa lotes)
  batchNumber: { type: String, trim: true, uppercase: true, maxlength: 40 },
  expirationDate: { type: Date },
  manufacturingDate: { type: Date },
  quantity: { type: Number, required: true, min: 1, validate: integerValidator },
  unitCost: moneyField({ required: true }),
  ivaRate: { type: Number, default: 0, validate: ivaValidator },
  lineSubtotal: moneyField(),
  lineTax: moneyField(),
  lineTotal: moneyField(),
  batch: { type: Schema.Types.ObjectId, ref: 'Batch' }, // se asigna al crear el lote
});

// Cada pago (o abono) a un proveedor. Sirve para el flujo de caja y las cuentas por pagar.
const paymentSchema = new Schema({
  amount: moneyField({ required: true, min: [0.01, 'El pago debe ser mayor a cero'] }),
  method: { type: String, enum: SUPPLIER_PAYMENT_METHODS, required: true },
  paidAt: { type: Date, default: Date.now },
  paidBy: { type: Schema.Types.ObjectId, ref: 'User' },
  note: { type: String, trim: true, maxlength: 200 },
});

const purchaseSchema = new Schema(
  {
    supplier: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
    invoiceNumber: {
      type: String,
      required: [true, 'El número de factura es obligatorio'],
      trim: true,
      uppercase: true,
      maxlength: 40,
    },
    purchaseDate: { type: Date, default: Date.now, required: true },
    items: {
      type: [purchaseItemSchema],
      validate: [(items) => items.length > 0, 'La compra debe tener al menos un producto'],
    },
    subtotal: moneyField(),
    taxTotal: moneyField(),
    total: moneyField(),

    paymentMethod: { type: String, enum: PURCHASE_PAYMENT_METHODS, default: 'cash' },
    paymentStatus: { type: String, enum: PAYMENT_STATUS, default: 'paid' },
    amountPaid: moneyField(),
    payments: { type: [paymentSchema], default: [] },
    dueDate: { type: Date },

    status: { type: String, enum: PURCHASE_STATUS, default: 'received' },
    notes: { type: String, trim: true, maxlength: 500 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    voidedAt: { type: Date },
    voidedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    voidReason: { type: String, trim: true, maxlength: 300 },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

purchaseSchema.virtual('balanceDue').get(function () {
  return Math.max(0, Math.round((this.total - this.amountPaid) * 100) / 100);
});

// Una factura no se repite por proveedor, salvo que la anterior se haya anulado
purchaseSchema.index(
  { supplier: 1, invoiceNumber: 1 },
  { unique: true, partialFilterExpression: { status: 'received' } }
);
purchaseSchema.index({ purchaseDate: -1 });
purchaseSchema.index({ supplier: 1, purchaseDate: -1 });
purchaseSchema.index({ paymentStatus: 1, dueDate: 1 }); // cuentas por pagar

export default mongoose.model('Purchase', purchaseSchema);
