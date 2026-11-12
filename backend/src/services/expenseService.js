import { Expense, Supplier } from '../models/index.js';
import { AppError } from '../utils/AppError.js';
import { escapeRegex } from '../utils/text.js';
import { audit } from './auditService.js';

const auditBase = (user, meta) => ({ userId: user._id, userEmail: user.email, meta });

async function assertSupplier(supplierId) {
  if (supplierId && !(await Supplier.exists({ _id: supplierId }))) {
    throw new AppError('Proveedor no encontrado', 404);
  }
}

export async function listExpenses({ page, limit, category, area, from, to, search, includeVoided }) {
  const filter = {};
  if (!includeVoided) filter.voidedAt = { $exists: false };
  if (category) filter.category = category;
  if (area) filter.area = area;
  if (search) filter.description = new RegExp(escapeRegex(search), 'i');
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = from;
    if (to) filter.date.$lte = to;
  }

  const [items, total, sum] = await Promise.all([
    Expense.find(filter)
      .sort({ date: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('supplier', 'name')
      .populate('createdBy', 'name'),
    Expense.countDocuments(filter),
    Expense.aggregate([
      { $match: { ...filter, voidedAt: { $exists: false } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);
  return { items, total, page, limit, pages: Math.ceil(total / limit), totalAmount: sum[0]?.total ?? 0 };
}

export async function getExpense(id) {
  const expense = await Expense.findById(id).populate('supplier', 'name').populate('createdBy', 'name');
  if (!expense) throw new AppError('Gasto no encontrado', 404);
  return expense;
}

export async function createExpense(data, user, meta) {
  await assertSupplier(data.supplierId);
  const { supplierId, ...rest } = data;
  const expense = await Expense.create({ ...rest, supplier: supplierId, createdBy: user._id });
  await audit({
    ...auditBase(user, meta),
    action: 'expense_created',
    entity: 'Expense',
    entityId: expense._id,
    metadata: { amount: expense.amount, category: expense.category },
  });
  return getExpense(expense._id);
}

export async function updateExpense(id, data, user, meta) {
  const expense = await Expense.findById(id);
  if (!expense) throw new AppError('Gasto no encontrado', 404);
  if (expense.voidedAt) throw new AppError('No se puede editar un gasto anulado', 409);
  await assertSupplier(data.supplierId);

  const before = { amount: expense.amount, category: expense.category, date: expense.date };
  const { supplierId, ...rest } = data;
  expense.set({ ...rest, ...(supplierId && { supplier: supplierId }) });
  await expense.save();

  await audit({
    ...auditBase(user, meta),
    action: 'expense_updated',
    entity: 'Expense',
    entityId: id,
    metadata: { before, fields: Object.keys(data) },
  });
  return getExpense(id);
}

// Los gastos no se borran: se anulan con motivo y dejan de sumar en los reportes
export async function voidExpense(id, { reason }, user, meta) {
  const expense = await Expense.findOneAndUpdate(
    { _id: id, voidedAt: { $exists: false } },
    { $set: { voidedAt: new Date(), voidedBy: user._id, voidReason: reason } },
    { returnDocument: 'after' }
  );
  if (!expense) {
    if (await Expense.exists({ _id: id })) throw new AppError('El gasto ya está anulado', 409);
    throw new AppError('Gasto no encontrado', 404);
  }
  await audit({
    ...auditBase(user, meta),
    action: 'expense_voided',
    entity: 'Expense',
    entityId: id,
    metadata: { amount: expense.amount, reason },
  });
  return getExpense(id);
}

// Total por categoría y por mes (para la gráfica de gastos)
export async function expenseSummary({ from, to, area }) {
  const match = { voidedAt: { $exists: false }, date: { $gte: from, $lte: to } };
  if (area) match.area = area;

  const [byCategory, byMonth] = await Promise.all([
    Expense.aggregate([
      { $match: match },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]),
    Expense.aggregate([
      { $match: match },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$date', timezone: 'America/Bogota' } }, total: { $sum: '$amount' } } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  return {
    total: byCategory.reduce((sum, row) => sum + row.total, 0),
    byCategory: byCategory.map((row) => ({ category: row._id, total: row.total, count: row.count })),
    byMonth: byMonth.map((row) => ({ period: row._id, total: row.total })),
  };
}
