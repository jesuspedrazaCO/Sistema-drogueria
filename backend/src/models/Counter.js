import mongoose from 'mongoose';

const { Schema } = mongoose;

// Consecutivos atómicos (ej. número de comprobante de venta).
// Se usa dentro de la misma transacción de la venta para no dejar saltos si algo falla.
const counterSchema = new Schema({
  _id: { type: String },
  seq: { type: Number, default: 0 },
});

counterSchema.statics.next = async function next(name, session) {
  const doc = await this.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, session }
  );
  return doc.seq;
};

export default mongoose.model('Counter', counterSchema);
