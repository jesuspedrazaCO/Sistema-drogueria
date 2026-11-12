import mongoose from 'mongoose';
import { PAYMENT_METHODS, SALE_STATUS } from '../config/constants.js';
import { moneyField, integerValidator, ivaValidator } from '../utils/modelHelpers.js';

const { Schema } = mongoose;

// De qué lote salió cada parte de la venta (FEFO). Guarda el costo para calcular utilidad.
const allocationSchema = new Schema(
  {
    batch: { type: Schema.Types.ObjectId, ref: 'Batch' },
    batchNumber: { type: String },
    expirationDate: { type: Date },
    quantity: { type: Number, required: true, min: 1, validate: integerValidator },
    unitCost: moneyField(),
  },
  { _id: false }
);

// En ventas, unitPrice es el precio al público CON IVA incluido.
// lineTotal = unitPrice * quantity - discount; lineTax = parte de IVA contenida en lineTotal.
const saleItemSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true }, // copia del nombre al momento de la venta
  area: { type: String },
  quantity: { type: Number, required: true, min: 1, validate: integerValidator },
  unitPrice: moneyField({ required: true }),
  discount: moneyField(),
  ivaRate: { type: Number, default: 0, validate: ivaValidator },
  lineSubtotal: moneyField(), // base sin IVA
  lineTax: moneyField(),
  lineTotal: moneyField(),
  allocations: { type: [allocationSchema], default: [] },
});

// Datos de la fórmula médica (obligatorios en la API para medicamentos que la requieren).
// Son datos personales sensibles (Ley 1581 de 2012): se piden solo los necesarios.
const prescriptionSchema = new Schema(
  {
    formulaNumber: { type: String, trim: true, maxlength: 40 },
    doctorName: { type: String, trim: true, maxlength: 100 },
    doctorLicense: { type: String, trim: true, maxlength: 40 },
    patientName: { type: String, trim: true, maxlength: 100 },
    patientDocument: { type: String, trim: true, maxlength: 30 },
    issuedAt: { type: Date },
  },
  { _id: false }
);

const saleSchema = new Schema(
  {
    receiptNumber: { type: Number, required: true, unique: true }, // consecutivo interno
    customer: { type: Schema.Types.ObjectId, ref: 'Customer' },
    items: {
      type: [saleItemSchema],
      validate: [(items) => items.length > 0, 'La venta debe tener al menos un producto'],
    },
    subtotal: moneyField(),
    discountTotal: moneyField(),
    taxTotal: moneyField(),
    total: moneyField(),

    paymentMethod: { type: String, enum: PAYMENT_METHODS, default: 'cash' },
    amountReceived: moneyField(),
    change: moneyField(),

    prescription: { type: prescriptionSchema },
    status: { type: String, enum: SALE_STATUS, default: 'completed' },
    notes: { type: String, trim: true, maxlength: 300 },

    soldBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    voidedAt: { type: Date },
    voidedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    voidReason: { type: String, trim: true, maxlength: 300 },
  },
  { timestamps: true }
);

saleSchema.index({ createdAt: -1 });
saleSchema.index({ status: 1, createdAt: -1 });
saleSchema.index({ soldBy: 1, createdAt: -1 });
saleSchema.index({ customer: 1, createdAt: -1 });
saleSchema.index({ 'items.product': 1, createdAt: -1 });

export default mongoose.model('Sale', saleSchema);
