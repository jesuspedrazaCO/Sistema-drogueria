// Datos de demostración para desarrollo:  npm run seed -- --reset
// Crea usuarios de los 4 roles, catálogo, proveedores, compras con lotes, ventas de los últimos
// 30 días, gastos y clientes, usando los mismos servicios que la API (así el stock y el kardex
// quedan consistentes). NUNCA se ejecuta contra producción.
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import * as models from '../models/index.js';
import { ROLES } from '../config/roles.js';
import { createPurchase, registerPayment } from '../services/purchaseService.js';
import { createSale, voidSale } from '../services/saleService.js';
import { createExpense } from '../services/expenseService.js';

const { User, Supplier, Product, Customer, Batch, Sale, StockMovement, Settings } = models;

export const DEMO_PASSWORD = 'Demo12345x';
const DAY = 24 * 60 * 60 * 1000;
const noon = (offsetDays) => {
  const d = new Date(Date.now() + offsetDays * DAY);
  return new Date(`${d.toISOString().slice(0, 10)}T12:00:00.000Z`);
};
const endOfDay = (offsetDays) => {
  const d = new Date(Date.now() + offsetDays * DAY);
  return new Date(`${d.toISOString().slice(0, 10)}T23:59:59.999Z`);
};

// Generador pseudoaleatorio con semilla: el seed produce siempre los mismos datos
function rng(seed = 20261108) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// [nombre, principio activo, categoría, presentación, costo, precio (IVA incl.), IVA, stock mín., extras]
const PHARMACY = [
  ['Acetaminofén 500 mg x 100 tabletas', 'Acetaminofén', 'Analgésicos', 'Caja x 100 tabletas', 8500, 13500, 0, 20],
  ['Ibuprofeno 400 mg x 50 tabletas', 'Ibuprofeno', 'Analgésicos', 'Caja x 50 tabletas', 9000, 15000, 0, 15],
  ['Naproxeno 250 mg x 30 tabletas', 'Naproxeno', 'Analgésicos', 'Caja x 30 tabletas', 6500, 11000, 0, 10],
  ['Diclofenaco gel 1% 40 g', 'Diclofenaco', 'Analgésicos', 'Tubo x 40 g', 5500, 9500, 0, 10],
  ['Amoxicilina 500 mg x 21 cápsulas', 'Amoxicilina', 'Antibióticos', 'Caja x 21 cápsulas', 12000, 19000, 0, 12, { requiresPrescription: true }],
  ['Azitromicina 500 mg x 3 tabletas', 'Azitromicina', 'Antibióticos', 'Caja x 3 tabletas', 14000, 22000, 0, 8, { requiresPrescription: true }],
  ['Loratadina 10 mg x 10 tabletas', 'Loratadina', 'Antialérgicos', 'Caja x 10 tabletas', 2500, 5000, 0, 15],
  ['Cetirizina 10 mg x 10 tabletas', 'Cetirizina', 'Antialérgicos', 'Caja x 10 tabletas', 3000, 6000, 0, 15],
  ['Omeprazol 20 mg x 14 cápsulas', 'Omeprazol', 'Gastrointestinales', 'Caja x 14 cápsulas', 4500, 8500, 0, 15],
  ['Loperamida 2 mg x 12 tabletas', 'Loperamida', 'Gastrointestinales', 'Caja x 12 tabletas', 3500, 6500, 0, 10],
  ['Hioscina 10 mg x 10 tabletas', 'Hioscina', 'Gastrointestinales', 'Caja x 10 tabletas', 5000, 9000, 0, 10, { buy: 0 }],
  ['Losartán 50 mg x 30 tabletas', 'Losartán', 'Cardiovasculares', 'Caja x 30 tabletas', 5500, 10000, 0, 12, { requiresPrescription: true }],
  ['Metformina 850 mg x 30 tabletas', 'Metformina', 'Diabetes', 'Caja x 30 tabletas', 6000, 11000, 0, 12, { requiresPrescription: true }],
  ['Salbutamol inhalador 100 mcg', 'Salbutamol', 'Respiratorios', 'Inhalador x 200 dosis', 9000, 16000, 0, 6, { requiresPrescription: true }],
  ['Suero oral sabor frutas 500 ml', 'Sales de rehidratación', 'Hidratación', 'Botella x 500 ml', 2200, 4000, 0, 15, { buy: 6 }],
  ['Vitamina C 500 mg x 100 tabletas', 'Ácido ascórbico', 'Vitaminas', 'Frasco x 100 tabletas', 11000, 18000, 0, 8],
  ['Complejo B x 30 tabletas', 'Vitaminas del complejo B', 'Vitaminas', 'Caja x 30 tabletas', 7000, 12500, 0, 8],
  ['Alcohol antiséptico 700 ml', 'Alcohol etílico', 'Antisépticos', 'Botella x 700 ml', 4200, 7500, 19, 10],
  ['Gasas estériles 10x10 x 100', undefined, 'Primeros auxilios', 'Paquete x 100', 8000, 14000, 19, 6],
  ['Jeringa desechable 5 ml', undefined, 'Primeros auxilios', 'Unidad', 450, 900, 19, 50],
  ['Tapabocas desechable x 50', undefined, 'Protección', 'Caja x 50', 6000, 11000, 19, 10],
  ['Termómetro digital', undefined, 'Equipos', 'Unidad', 9000, 17000, 19, 4],
  ['Protector solar FPS 50 120 ml', 'Filtros solares', 'Dermocosmética', 'Tubo x 120 ml', 28000, 46000, 19, 5],
  ['Clonazepam 2 mg x 30 tabletas', 'Clonazepam', 'Control especial', 'Caja x 30 tabletas', 10000, 18000, 0, 5, { isControlled: true }],
  ['Tramadol 50 mg x 20 cápsulas', 'Tramadol', 'Control especial', 'Caja x 20 cápsulas', 9500, 17000, 0, 5, { isControlled: true }],
];
const HARDWARE = [
  ['Martillo 16 oz', 'Herramientas', 12000, 22000, 19, 3],
  ['Destornillador de pala 6 pulgadas', 'Herramientas', 3500, 7000, 19, 5],
  ['Cinta aislante negra', 'Eléctricos', 1500, 3000, 19, 10],
  ['Bombillo LED 9 W', 'Eléctricos', 3500, 6500, 19, 10],
  ['Extensión eléctrica 3 m', 'Eléctricos', 9000, 16000, 19, 4],
  ['Tornillos para madera caja x 100', 'Ferretería general', 4000, 8000, 19, 6],
];

export async function runSeed({ log = () => {} } = {}) {
  const random = rng();
  const pick = (list) => list[Math.floor(random() * list.length)];
  const between = (min, max) => min + Math.floor(random() * (max - min + 1));

  // --- Usuarios y ajustes ---
  const users = {};
  for (const role of Object.values(ROLES)) {
    users[role] = await User.create({
      name: { admin: 'Ana Administradora', regente: 'Carlos Regente', vendedor: 'Valeria Vendedora', contador: 'Camilo Contador' }[role],
      email: `${role}@drogueria.demo`,
      password: DEMO_PASSWORD,
      role,
    });
  }
  const settings = await Settings.getSingleton();
  settings.set({ businessName: 'Droguería Demo', nit: '900.000.000-1', city: 'Bucaramanga', address: 'Calle 1 # 2-3', phone: '6070000000', receiptFooter: 'Gracias por su compra' });
  await settings.save();
  log('Usuarios y ajustes listos');

  // --- Proveedores y catálogo ---
  const suppliers = await Supplier.create([
    { name: 'Distribuidora Farmacéutica del Oriente', nit: '900111222-1', contactName: 'Laura Mora', phone: '6071111111', paymentTermsDays: 30 },
    { name: 'Droguería Mayorista Santander', nit: '900333444-5', contactName: 'Pedro Rey', phone: '6072222222', paymentTermsDays: 15 },
    { name: 'Ferretería y Suministros Andina', nit: '900555666-7', contactName: 'Marta Díaz', phone: '6073333333', paymentTermsDays: 0 },
  ]);

  const products = [];
  for (const [name, activeIngredient, category, presentation, costPrice, salePrice, ivaRate, minStock, extra = {}] of PHARMACY) {
    const { buy, ...fields } = extra;
    const product = await Product.create({
      area: 'drogueria', name, activeIngredient, category, presentation, costPrice, salePrice, ivaRate, minStock,
      brand: 'Laboratorio Demo', invimaRegistry: 'INVIMA DEMO', createdBy: users.admin._id, ...fields,
    });
    products.push({ product, buy: buy ?? between(40, 120) });
  }
  for (const [name, category, costPrice, salePrice, ivaRate, minStock] of HARDWARE) {
    const product = await Product.create({ area: 'ferreteria', name, category, costPrice, salePrice, ivaRate, minStock, createdBy: users.admin._id });
    products.push({ product, buy: between(10, 40) });
  }
  log(`Catálogo: ${products.length} productos`);

  // --- Compras (hace ~35 días), con lotes de distintos vencimientos ---
  const SOON = { 4: 12, 8: 45, 13: 70 }; // índice de producto -> días para vencer (alertas de demo)
  const groups = [[], [], []];
  products.forEach((entry, index) => {
    if (entry.buy <= 0) return;
    groups[entry.product.area === 'ferreteria' ? 2 : index % 2].push({ ...entry, index });
  });

  const purchases = [];
  for (const [g, group] of groups.entries()) {
    const items = group.map(({ product, buy, index }) => {
      const base = { productId: product._id, quantity: buy, unitCost: product.costPrice };
      if (product.area === 'ferreteria') return base;
      return { ...base, batchNumber: `L${String(index + 1).padStart(2, '0')}-${between(1000, 9999)}`, expirationDate: endOfDay(SOON[index] ?? between(150, 720)) };
    });
    const credit = g === 0;
    purchases.push(
      await createPurchase(
        { supplierId: suppliers[g]._id, invoiceNumber: `FV-${1000 + g}`, purchaseDate: noon(-35), items, paymentMethod: credit ? 'credit' : 'cash', notes: 'Compra de demostración' },
        users.regente,
        {}
      )
    );
  }
  await registerPayment(purchases[0]._id, { amount: 500000, method: 'transfer', paidAt: noon(-20) }, users.contador, {});
  // Un lote vencido con existencias (para ver la alerta y la baja)
  const demoBatch = await Batch.findOne({ product: products[2].product._id });
  await Batch.collection.updateOne({ _id: demoBatch._id }, { $set: { expirationDate: endOfDay(-5) } });
  log(`Compras: ${purchases.length}`);

  // --- Clientes ---
  const customers = await Customer.create(
    ['María Gómez', 'Juan Pérez', 'Luisa Torres', 'Andrés Rojas', 'Sofía Herrera', 'Mateo Cruz'].map((name, i) => ({
      name, documentType: 'CC', documentNumber: String(1000000 + i * 137), phone: `300${1000000 + i}`,
    }))
  );

  // --- Ventas de los últimos 30 días ---
  const sellable = products.filter((entry) => !entry.product.isControlled);
  const rx = { formulaNumber: 'F-DEMO', doctorName: 'Dr. Demo', patientName: 'Paciente Demo', patientDocument: '123456' };
  const methods = ['cash', 'cash', 'cash', 'card', 'transfer'];
  const created = [];

  const sellOne = async (dayOffset) => {
    const lines = new Map();
    for (let i = 0, n = between(1, 4); i < n; i += 1) lines.set(String(pick(sellable).product._id), between(1, 3));
    const chosen = [...lines].map(([id, quantity]) => ({ productId: id, quantity }));
    const needsRx = chosen.some(({ productId }) => products.find((e) => String(e.product._id) === productId).product.requiresPrescription);
    try {
      const sale = await createSale(
        {
          items: chosen,
          paymentMethod: pick(methods),
          customerId: random() < 0.3 ? pick(customers)._id : undefined,
          prescription: needsRx ? { ...rx, issuedAt: noon(dayOffset) } : undefined,
        },
        users.vendedor,
        {}
      );
      const when = new Date(Date.now() + dayOffset * DAY);
      when.setUTCHours(between(13, 24) % 24, between(0, 59), 0, 0); // 8 a.m.–7 p.m. hora Colombia
      if (when > new Date()) when.setTime(Date.now() - 60 * 1000);
      await Sale.collection.updateOne({ _id: sale._id }, { $set: { createdAt: when } });
      await StockMovement.collection.updateMany({ refModel: 'Sale', refId: sale._id }, { $set: { createdAt: when } });
      created.push(sale);
    } catch (err) {
      if (err.statusCode !== 409) throw err; // sin existencias: se omite esa venta
    }
  };
  for (let day = -29; day <= 0; day += 1) {
    for (let k = 0, n = between(3, 7); k < n; k += 1) await sellOne(day);
  }
  // Una venta de control especial con el regente, y dos anulaciones
  const controlled = products.find((e) => e.product.isControlled);
  await createSale(
    { items: [{ productId: controlled.product._id, quantity: 1 }], paymentMethod: 'cash', prescription: { ...rx, doctorLicense: 'RM-DEMO', issuedAt: noon(-1) } },
    users.regente,
    {}
  );
  for (const sale of created.slice(5, 7)) await voidSale(sale._id, { reason: 'Error de cobro (demo)' }, users.regente, {});
  log(`Ventas: ${created.length + 1}`);

  // --- Gastos ---
  const expenses = [
    ['Arriendo del local', 1800000, 'rent', -12], ['Nómina', 2600000, 'payroll', -14], ['Servicios públicos', 420000, 'utilities', -3],
    ['Transporte de mercancía', 85000, 'transport', -6], ['Arriendo del local', 1800000, 'rent', -33], ['Nómina', 2600000, 'payroll', -34],
    ['Servicios públicos', 395000, 'utilities', -33], ['Publicidad en redes', 150000, 'marketing', -9],
  ];
  for (const [description, amount, category, offset] of expenses) {
    await createExpense({ description, amount, category, area: 'general', date: noon(offset), paymentMethod: 'transfer' }, users.contador, {});
  }
  log(`Gastos: ${expenses.length}`);

  return { users: Object.values(users).map((user) => user.email), password: DEMO_PASSWORD };
}

// ---------------------------------------------------------------------------
// Ejecución desde la terminal
// ---------------------------------------------------------------------------
export function assertSafeTarget({ nodeEnv, dbName }) {
  if (nodeEnv === 'production') throw new Error('El seed no se ejecuta con NODE_ENV=production.');
  if (/prod/i.test(dbName ?? '')) throw new Error(`La base "${dbName}" parece de producción: el seed se niega a correr.`);
}

async function main() {
  const { env } = await import('../config/env.js');
  const { connectDB, disconnectDB } = await import('../config/db.js');
  await connectDB();
  try {
    assertSafeTarget({ nodeEnv: env.NODE_ENV, dbName: mongoose.connection.name });
    const hasData = (await User.countDocuments({})) + (await Product.countDocuments({})) > 0;
    if (hasData && !process.argv.includes('--reset')) {
      throw new Error('La base ya tiene datos. Usa  npm run seed -- --reset  para borrarlos y cargar la demo.');
    }
    if (hasData) {
      console.log(`Borrando datos de "${mongoose.connection.name}"...`);
      for (const Model of Object.values(models)) await Model.deleteMany({});
    }
    console.log('Cargando datos de demostración (puede tardar un par de minutos)...');
    const result = await runSeed({ log: (line) => console.log(` · ${line}`) });
    console.log('\nListo. Usuarios de prueba (misma contraseña):');
    for (const email of result.users) console.log(`  ${email}`);
    console.log(`  Contraseña: ${result.password}`);
  } finally {
    await disconnectDB();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(`\n${err.message}`);
    process.exit(1);
  });
}
