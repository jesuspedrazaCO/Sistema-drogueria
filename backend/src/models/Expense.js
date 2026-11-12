import mongoose from 'mongoose';
import { EXPENSE_CATEGORIES, EXPENSE_AREAS, PAYMENT_METHODS } from '../config/constants.js';
import { moneyField } from '../utils/modelHelpers.js';

const { Schema } = mongoose;

const expenseSchema = new Schema(
  {
    description: {
      type: String,
      required: [true, 'La descripción es obligatoria'],
      trim: true,
      maxlength: 200,
    },
    category: { type: String, enum: EXPENSE_CATEGORIES, required: true, default: 'other' },
    area: { type: String, enum: EXPENSE_AREAS, default: 'general' },
    amount: moneyField({
      required: [true, 'El monto es obligatorio'],
      min: [0.01, 'El monto debe ser mayor a 0'],
    }),
    date: { type: Date, default: Date.now, required: true },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, default: 'cash' },
    supplier: { type: Schema.Types.ObjectId, ref: 'Supplier' },
    receiptNumber: { type: String, trim: true, maxlength: 40 },
    notes: { type: String, trim: true, maxlength: 500 },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    voidedAt: { type: Date },
    voidedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    voidReason: { type: String, trim: true, maxlength: 300 },
  },
  { timestamps: true }
);

expenseSchema.index({ date: -1 });
expenseSchema.index({ category: 1, date: -1 });
expenseSchema.index({ area: 1, date: -1 });

export default mongoose.model('Expense', expenseSchema);
