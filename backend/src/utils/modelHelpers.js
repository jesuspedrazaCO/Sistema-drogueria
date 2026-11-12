import { IVA_RATES } from '../config/constants.js';

// Redondea a 2 decimales evitando errores de coma flotante
export const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

// Campo de dinero: no negativo, redondeado a 2 decimales
export const moneyField = (extra = {}) => ({
  type: Number,
  min: [0, 'El valor no puede ser negativo'],
  default: 0,
  set: (value) => (value == null ? value : round2(value)),
  ...extra,
});

export const integerValidator = {
  validator: Number.isInteger,
  message: '{PATH} debe ser un número entero',
};

export const ivaValidator = {
  validator: (value) => IVA_RATES.includes(value),
  message: `Tarifa de IVA no válida (permitidas: ${IVA_RATES.join(', ')})`,
};

const MUTATING_OPS = [
  'updateOne',
  'updateMany',
  'findOneAndUpdate',
  'findOneAndReplace',
  'replaceOne',
  'deleteOne',
  'deleteMany',
  'findOneAndDelete',
];

// Hace que una colección sea de solo inserción (kardex, auditoría):
// se bloquean las actualizaciones y borrados desde Mongoose.
export function makeImmutable(schema, message) {
  for (const op of MUTATING_OPS) {
    schema.pre(op, function () {
      throw new Error(message);
    });
  }
  schema.pre('save', function () {
    if (!this.isNew) throw new Error(message);
  });
}
