import { Batch, Product } from '../models/index.js';
import { AppError } from '../utils/AppError.js';
import { searchTokens } from '../utils/text.js';
import { audit } from './auditService.js';

const auditBase = (user, meta) => ({ userId: user._id, userEmail: user.email, meta });

const SORTS = {
  name: { name: 1 },
  stock: { stock: 1, name: 1 },
  newest: { createdAt: -1 },
};

export async function listProducts({ page, limit, search, area, category, isActive, stockStatus, sort }) {
  const filter = {};
  if (area) filter.area = area;
  if (category) filter.category = category;
  if (typeof isActive === 'boolean') filter.isActive = isActive;

  const tokens = searchTokens(search);
  if (tokens.length) filter.$and = tokens.map((token) => ({ searchKey: token }));

  // Estado de stock: coincide con el virtual stockStatus del modelo
  if (stockStatus === 'out') filter.stock = { $lte: 0 };
  else if (stockStatus === 'low') {
    filter.stock = { $gt: 0 };
    filter.$expr = { $lte: ['$stock', '$minStock'] };
  } else if (stockStatus === 'ok') {
    filter.stock = { $gt: 0 };
    filter.$expr = { $gt: ['$stock', '$minStock'] };
  }

  const query = Product.find(filter).sort(SORTS[sort] ?? SORTS.name);
  if (sort === 'name' || !sort) query.collation({ locale: 'es' });

  const [items, total] = await Promise.all([
    query.skip((page - 1) * limit).limit(limit),
    Product.countDocuments(filter),
  ]);
  return { items, total, page, limit, pages: Math.ceil(total / limit) };
}

// Producto con sus lotes con existencias (el que vence primero va arriba: orden FEFO)
export async function getProduct(id) {
  const product = await Product.findById(id);
  if (!product) throw new AppError('Producto no encontrado', 404);
  const batches = product.trackBatches
    ? await Batch.find({ product: id, quantityAvailable: { $gt: 0 } }).sort({ expirationDate: 1 })
    : [];
  return { product, batches };
}

export async function createProduct(data, user, meta) {
  const product = await Product.create({ ...data, createdBy: user._id, updatedBy: user._id });
  await audit({
    ...auditBase(user, meta),
    action: 'product_created',
    entity: 'Product',
    entityId: product._id,
    metadata: { name: product.name, area: product.area },
  });
  return product;
}

export async function updateProduct(id, data, user, meta) {
  const product = await Product.findById(id);
  if (!product) throw new AppError('Producto no encontrado', 404);

  const before = { costPrice: product.costPrice, salePrice: product.salePrice, ivaRate: product.ivaRate };

  product.set({ ...data, updatedBy: user._id });
  await product.save(); // save() recalcula searchKey y aplica las reglas del modelo

  await audit({
    ...auditBase(user, meta),
    action: 'product_updated',
    entity: 'Product',
    entityId: id,
    metadata: { fields: Object.keys(data) },
  });

  const priceChanged = Object.keys(before).some((key) => product[key] !== before[key]);
  if (priceChanged) {
    await audit({
      ...auditBase(user, meta),
      action: 'product_price_changed',
      entity: 'Product',
      entityId: id,
      metadata: {
        before,
        after: { costPrice: product.costPrice, salePrice: product.salePrice, ivaRate: product.ivaRate },
      },
    });
  }
  return product;
}

// Categorías ya usadas (para el autocompletado del formulario)
export async function listCategories() {
  const categories = await Product.distinct('category', { category: { $ne: null } });
  return categories.filter(Boolean).sort((a, b) => a.localeCompare(b, 'es'));
}
