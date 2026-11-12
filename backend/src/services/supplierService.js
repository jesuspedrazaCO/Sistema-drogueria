import { Supplier } from '../models/index.js';
import { AppError } from '../utils/AppError.js';
import { escapeRegex } from '../utils/text.js';
import { audit } from './auditService.js';

const auditBase = (user, meta) => ({ userId: user._id, userEmail: user.email, meta });

export async function listSuppliers({ page, limit, search, isActive }) {
  const filter = {};
  if (typeof isActive === 'boolean') filter.isActive = isActive;
  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: pattern }, { nit: pattern }, { contactName: pattern }];
  }

  const [items, total] = await Promise.all([
    Supplier.find(filter)
      .sort({ name: 1 })
      .collation({ locale: 'es' })
      .skip((page - 1) * limit)
      .limit(limit),
    Supplier.countDocuments(filter),
  ]);
  return { items, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function getSupplier(id) {
  const supplier = await Supplier.findById(id);
  if (!supplier) throw new AppError('Proveedor no encontrado', 404);
  return supplier;
}

export async function createSupplier(data, user, meta) {
  if (data.nit && (await Supplier.exists({ nit: data.nit }))) {
    throw new AppError('Ya existe un proveedor con ese NIT', 409);
  }
  const supplier = await Supplier.create(data);
  await audit({
    ...auditBase(user, meta),
    action: 'supplier_created',
    entity: 'Supplier',
    entityId: supplier._id,
    metadata: { name: supplier.name },
  });
  return supplier;
}

export async function updateSupplier(id, data, user, meta) {
  const supplier = await getSupplier(id);

  if (data.nit && data.nit !== supplier.nit && (await Supplier.exists({ nit: data.nit, _id: { $ne: id } }))) {
    throw new AppError('Ya existe un proveedor con ese NIT', 409);
  }

  supplier.set(data);
  await supplier.save();
  await audit({
    ...auditBase(user, meta),
    action: 'supplier_updated',
    entity: 'Supplier',
    entityId: id,
    metadata: { fields: Object.keys(data) },
  });
  return supplier;
}
