import { Customer } from '../models/index.js';
import { AppError } from '../utils/AppError.js';
import { escapeRegex } from '../utils/text.js';

export async function listCustomers({ page, limit, search, isActive }) {
  const filter = {};
  if (typeof isActive === 'boolean') filter.isActive = isActive;
  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: pattern }, { documentNumber: pattern }, { phone: pattern }];
  }
  const [items, total] = await Promise.all([
    Customer.find(filter)
      .sort({ name: 1 })
      .collation({ locale: 'es' })
      .skip((page - 1) * limit)
      .limit(limit),
    Customer.countDocuments(filter),
  ]);
  return { items, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function getCustomer(id) {
  const customer = await Customer.findById(id);
  if (!customer) throw new AppError('Cliente no encontrado', 404);
  return customer;
}

async function assertUniqueDocument(documentType, documentNumber, exceptId) {
  if (!documentNumber) return;
  const filter = { documentType, documentNumber };
  if (exceptId) filter._id = { $ne: exceptId };
  if (await Customer.exists(filter)) throw new AppError('Ya existe un cliente con ese documento', 409);
}

export async function createCustomer(data) {
  await assertUniqueDocument(data.documentType ?? 'CC', data.documentNumber);
  return Customer.create(data);
}

export async function updateCustomer(id, data) {
  const customer = await getCustomer(id);
  await assertUniqueDocument(
    data.documentType ?? customer.documentType,
    data.documentNumber ?? customer.documentNumber,
    id
  );
  customer.set(data);
  await customer.save();
  return customer;
}
