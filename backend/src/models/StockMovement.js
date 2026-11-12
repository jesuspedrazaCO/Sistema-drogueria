import mongoose from 'mongoose';
import { MOVEMENT_TYPE_LIST } from '../config/constants.js';
import { moneyField, makeImmutable } from '../utils/modelHelpers.js';

const { Schema } = mongoose;

// Kardex: cada entrada o salida de inventario deja un registro que no se edita ni se borra.
// quantity va con signo: positivo = entra, negativo = sale.
const stockMovementSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    batch: { type: Schema.Types.ObjectId, ref: 'Batch' },
    type: { type: String, enum: MOVEMENT_TYPE_LIST, required: true },
    quantity: {
      type: Number,
      required: true,
      validate: {
        validator: (value) => Number.isInteger(value) && value !== 0,
        message: 'La cantidad debe ser un entero distinto de cero',
      },
    },
    balanceAfter: { type: Number, required: true, min: 0 }, // stock total del producto después del movimiento
    unitCost: moneyField(),
    reason: { type: String, trim: true, maxlength: 300 },
    refModel: { type: String, enum: ['Sale', 'Purchase'] },
    refId: { type: Schema.Types.ObjectId, refPath: 'refModel' },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

makeImmutable(stockMovementSchema, 'Los movimientos de inventario son inmutables');

stockMovementSchema.index({ product: 1, createdAt: -1 });
stockMovementSchema.index({ batch: 1, createdAt: -1 });
stockMovementSchema.index({ type: 1, createdAt: -1 });
stockMovementSchema.index({ refModel: 1, refId: 1 });
stockMovementSchema.index({ createdAt: -1 });

export default mongoose.model('StockMovement', stockMovementSchema);
