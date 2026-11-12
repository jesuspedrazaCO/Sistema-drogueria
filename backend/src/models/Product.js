import mongoose from 'mongoose';
import {
  PRODUCT_AREAS,
  PRODUCT_AREA_LIST,
  STORAGE_CONDITIONS,
} from '../config/constants.js';
import { moneyField, integerValidator, ivaValidator } from '../utils/modelHelpers.js';
import { normalizeText } from '../utils/text.js';

const { Schema } = mongoose;

// Las cadenas vacías pasan a undefined para que los índices únicos "sparse" funcionen
const emptyToUndefined = (value) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

const productSchema = new Schema(
  {
    area: {
      type: String,
      enum: PRODUCT_AREA_LIST,
      default: PRODUCT_AREAS.DROGUERIA,
      required: true,
    },
    name: {
      type: String,
      required: [true, 'El nombre del producto es obligatorio'],
      trim: true,
      maxlength: 150,
    },
    sku: { type: String, trim: true, uppercase: true, maxlength: 40, set: emptyToUndefined },
    barcode: { type: String, trim: true, maxlength: 60, set: emptyToUndefined },
    brand: { type: String, trim: true, maxlength: 80 }, // laboratorio o marca
    category: { type: String, trim: true, maxlength: 60 },
    presentation: { type: String, trim: true, maxlength: 100 }, // ej. "Caja x 20 tabletas"
    unit: { type: String, trim: true, maxlength: 20, default: 'unidad' },

    // --- Solo droguería (en ferretería se limpian automáticamente) ---
    activeIngredient: { type: String, trim: true, maxlength: 120 }, // principio activo
    concentration: { type: String, trim: true, maxlength: 60 }, // ej. "500 mg"
    pharmaceuticalForm: { type: String, trim: true, maxlength: 60 }, // tableta, jarabe, crema...
    invimaRegistry: { type: String, trim: true, maxlength: 60 },
    requiresPrescription: { type: Boolean, default: false }, // venta con fórmula médica
    isControlled: { type: Boolean, default: false }, // medicamento de control especial
    storageCondition: { type: String, enum: STORAGE_CONDITIONS, default: 'ambient' },

    // --- Precios ---
    // costPrice: costo unitario SIN IVA. salePrice: precio al público CON IVA incluido.
    costPrice: moneyField(),
    salePrice: moneyField({ required: [true, 'El precio de venta es obligatorio'] }),
    ivaRate: { type: Number, default: 0, validate: ivaValidator },

    // --- Inventario ---
    // stock = suma de los lotes disponibles (droguería) o cantidad directa (ferretería).
    // Lo mantienen los servicios dentro de transacciones; nunca se edita a mano.
    stock: { type: Number, default: 0, min: 0, validate: integerValidator },
    minStock: { type: Number, default: 0, min: 0, validate: integerValidator },
    maxStock: { type: Number, min: 0, validate: integerValidator },
    trackBatches: { type: Boolean, default: true }, // lotes y vencimientos (siempre true en droguería)
    location: { type: String, trim: true, maxlength: 60 }, // estante / bodega

    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },

    // Texto de búsqueda en minúsculas y sin tildes (nombre, principio activo, marca, códigos).
    // Se calcula solo al guardar; así "acetaminofen" encuentra "Acetaminofén".
    searchKey: { type: String, select: false },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        delete ret.searchKey;
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

productSchema.virtual('stockStatus').get(function () {
  if (this.stock <= 0) return 'out';
  if (this.stock <= this.minStock) return 'low';
  return 'ok';
});

productSchema.pre('validate', function () {
  if (this.area === PRODUCT_AREAS.DROGUERIA) {
    this.trackBatches = true;
    if (this.isControlled) this.requiresPrescription = true;
  } else {
    this.trackBatches = false;
    this.activeIngredient = undefined;
    this.concentration = undefined;
    this.pharmaceuticalForm = undefined;
    this.invimaRegistry = undefined;
    this.requiresPrescription = false;
    this.isControlled = false;
    this.storageCondition = 'ambient';
  }

  if (this.maxStock != null && this.maxStock < this.minStock) {
    this.invalidate('maxStock', 'El stock máximo no puede ser menor al mínimo');
  }

  this.searchKey = normalizeText(
    [this.name, this.activeIngredient, this.brand, this.category, this.concentration, this.sku, this.barcode]
      .filter(Boolean)
      .join(' ')
  );
});

productSchema.index({ sku: 1 }, { unique: true, sparse: true });
productSchema.index({ barcode: 1 }, { unique: true, sparse: true });
productSchema.index({ area: 1, isActive: 1, name: 1 });
productSchema.index({ isActive: 1, stock: 1 }); // consultas de stock bajo / agotado
productSchema.index({ category: 1 });
productSchema.index(
  { name: 'text', activeIngredient: 'text', brand: 'text' },
  { default_language: 'spanish', name: 'product_text' }
);

export default mongoose.model('Product', productSchema);
