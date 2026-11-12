import mongoose from 'mongoose';

const { Schema } = mongoose;

// Configuración del negocio: un único documento (key = "main").
const settingsSchema = new Schema(
  {
    key: { type: String, default: 'main', unique: true },
    businessName: { type: String, trim: true, maxlength: 120, default: 'Droguería' },
    nit: { type: String, trim: true, maxlength: 20 },
    address: { type: String, trim: true, maxlength: 160 },
    city: { type: String, trim: true, maxlength: 60 },
    phone: { type: String, trim: true, maxlength: 30 },
    email: { type: String, trim: true, lowercase: true, maxlength: 120 },
    receiptFooter: { type: String, trim: true, maxlength: 200, default: '' },

    // Umbrales de las alertas de vencimiento (en días)
    expiryAlertDays: { type: Number, min: 1, default: 90 },
    criticalExpiryDays: { type: Number, min: 1, default: 30 },

    timezone: { type: String, default: 'America/Bogota' },
    currency: { type: String, default: 'COP' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

settingsSchema.statics.getSingleton = function getSingleton() {
  return this.findOneAndUpdate(
    { key: 'main' },
    { $setOnInsert: { key: 'main' } },
    { new: true, upsert: true }
  );
};

export default mongoose.model('Settings', settingsSchema);
