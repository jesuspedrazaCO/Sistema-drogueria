import { Batch, Expense, Product, Purchase, Sale } from '../models/index.js';
import { round2 } from '../utils/modelHelpers.js';
import { monthRange, todayRange, lastDaysRange } from '../utils/dates.js';
import { PERMISSIONS } from '../config/permissions.js';
import { alertCounts } from './alertService.js';

const TZ = 'America/Bogota';
const FORMATS = { day: '%Y-%m-%d', month: '%Y-%m' };
const completed = (from, to) => ({ status: 'completed', createdAt: { $gte: from, $lte: to } });

// ---------------------------------------------------------------------------
// Ventas por período (gráfica de ventas)
// ---------------------------------------------------------------------------
export async function salesSummary({ from, to, groupBy }) {
  const match = completed(from, to);
  const [series, methods] = await Promise.all([
    Sale.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: FORMATS[groupBy], date: '$createdAt', timezone: TZ } },
          sales: { $sum: '$total' },
          count: { $sum: 1 },
          tax: { $sum: '$taxTotal' },
          discount: { $sum: '$discountTotal' },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Sale.aggregate([
      { $match: match },
      { $group: { _id: '$paymentMethod', sales: { $sum: '$total' }, count: { $sum: 1 } } },
      { $sort: { sales: -1 } },
    ]),
  ]);

  const totals = series.reduce(
    (acc, row) => ({
      sales: acc.sales + row.sales,
      count: acc.count + row.count,
      tax: acc.tax + row.tax,
      discount: acc.discount + row.discount,
    }),
    { sales: 0, count: 0, tax: 0, discount: 0 }
  );

  return {
    groupBy,
    series: series.map((row) => ({ period: row._id, sales: round2(row.sales), count: row.count, tax: round2(row.tax), discount: round2(row.discount) })),
    totals: {
      sales: round2(totals.sales),
      count: totals.count,
      tax: round2(totals.tax),
      discount: round2(totals.discount),
      averageTicket: totals.count ? round2(totals.sales / totals.count) : 0,
    },
    byPaymentMethod: methods.map((row) => ({ method: row._id, sales: round2(row.sales), count: row.count })),
  };
}

// ---------------------------------------------------------------------------
// Productos más vendidos
// ---------------------------------------------------------------------------
export async function topProducts({ from, to, limit, by }) {
  const rows = await Sale.aggregate([
    { $match: completed(from, to) },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        name: { $first: '$items.name' },
        area: { $first: '$items.area' },
        quantity: { $sum: '$items.quantity' },
        revenue: { $sum: '$items.lineTotal' },
      },
    },
    { $sort: { [by === 'revenue' ? 'revenue' : 'quantity']: -1 } },
    { $limit: limit },
  ]);
  return rows.map((row) => ({ productId: row._id, name: row.name, area: row.area, quantity: row.quantity, revenue: round2(row.revenue) }));
}

// ---------------------------------------------------------------------------
// Utilidad: ingresos sin IVA − costo de lo vendido − gastos
// ---------------------------------------------------------------------------
export async function profitReport({ from, to }) {
  const [revenueRows, cogsRows, expenseRows, purchaseRows, paymentRows] = await Promise.all([
    Sale.aggregate([
      { $match: completed(from, to) },
      { $group: { _id: null, revenue: { $sum: '$subtotal' }, tax: { $sum: '$taxTotal' }, discounts: { $sum: '$discountTotal' }, gross: { $sum: '$total' }, count: { $sum: 1 } } },
    ]),
    Sale.aggregate([
      { $match: completed(from, to) },
      { $unwind: '$items' },
      { $unwind: '$items.allocations' },
      { $group: { _id: '$items.area', cogs: { $sum: { $multiply: ['$items.allocations.quantity', '$items.allocations.unitCost'] } } } },
    ]),
    Expense.aggregate([
      { $match: { voidedAt: { $exists: false }, date: { $gte: from, $lte: to } } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
    ]),
    Purchase.aggregate([
      { $match: { status: 'received', purchaseDate: { $gte: from, $lte: to } } },
      { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
    ]),
    Purchase.aggregate([
      { $match: { status: 'received' } },
      { $unwind: '$payments' },
      { $match: { 'payments.paidAt': { $gte: from, $lte: to } } },
      { $group: { _id: null, total: { $sum: '$payments.amount' } } },
    ]),
  ]);

  const sales = revenueRows[0] ?? { revenue: 0, tax: 0, discounts: 0, gross: 0, count: 0 };
  const cogs = round2(cogsRows.reduce((sum, row) => sum + row.cogs, 0));
  const expensesTotal = round2(expenseRows.reduce((sum, row) => sum + row.total, 0));
  const grossProfit = round2(sales.revenue - cogs);

  return {
    sales: { count: sales.count, total: round2(sales.gross), revenueWithoutTax: round2(sales.revenue), taxCollected: round2(sales.tax), discounts: round2(sales.discounts) },
    costOfGoodsSold: cogs,
    grossProfit,
    grossMarginPct: sales.revenue ? round2((grossProfit / sales.revenue) * 100) : 0,
    byArea: cogsRows.map((row) => ({ area: row._id, cogs: round2(row.cogs) })),
    expenses: { total: expensesTotal, byCategory: expenseRows.map((row) => ({ category: row._id, total: round2(row.total) })) },
    netProfit: round2(grossProfit - expensesTotal),
    cashFlow: {
      purchasesInvoiced: round2(purchaseRows[0]?.total ?? 0),
      paidToSuppliers: round2(paymentRows[0]?.total ?? 0),
    },
  };
}

// ---------------------------------------------------------------------------
// Valor del inventario (a costo y a precio de venta)
// ---------------------------------------------------------------------------
export async function inventoryValue() {
  const now = new Date();
  const [batchRows, expiredRows, productRows] = await Promise.all([
    Batch.aggregate([
      { $match: { quantityAvailable: { $gt: 0 } } },
      { $group: { _id: null, units: { $sum: '$quantityAvailable' }, cost: { $sum: { $multiply: ['$quantityAvailable', '$unitCost'] } } } },
    ]),
    Batch.aggregate([
      { $match: { quantityAvailable: { $gt: 0 }, expirationDate: { $lt: now } } },
      { $group: { _id: null, units: { $sum: '$quantityAvailable' }, cost: { $sum: { $multiply: ['$quantityAvailable', '$unitCost'] } } } },
    ]),
    Product.aggregate([
      { $match: { isActive: true, stock: { $gt: 0 } } },
      {
        $group: {
          _id: '$area',
          products: { $sum: 1 },
          units: { $sum: '$stock' },
          costValue: { $sum: { $multiply: ['$stock', '$costPrice'] } },
          saleValue: { $sum: { $multiply: ['$stock', '$salePrice'] } },
        },
      },
    ]),
  ]);

  // Droguería se valora con el costo real de cada lote; ferretería con el último costo
  const byArea = productRows.map((row) => ({
    area: row._id,
    products: row.products,
    units: row.units,
    costValue: round2(row._id === 'drogueria' ? (batchRows[0]?.cost ?? 0) : row.costValue),
    saleValue: round2(row.saleValue),
  }));

  return {
    byArea,
    totals: {
      units: byArea.reduce((sum, row) => sum + row.units, 0),
      costValue: round2(byArea.reduce((sum, row) => sum + row.costValue, 0)),
      saleValue: round2(byArea.reduce((sum, row) => sum + row.saleValue, 0)),
    },
    expiredAtRisk: { units: expiredRows[0]?.units ?? 0, costValue: round2(expiredRows[0]?.cost ?? 0) },
  };
}

// ---------------------------------------------------------------------------
// Tablero principal: cada rol recibe solo lo que puede ver
// ---------------------------------------------------------------------------
export async function dashboard(user) {
  const today = todayRange();
  const month = monthRange();
  const week = lastDaysRange(7);
  const canFinance = PERMISSIONS.viewFinance.includes(user.role);
  const canCosts = PERMISSIONS.viewCosts.includes(user.role);

  const [todaySales, monthSales, last7, alerts, profit, value, payables] = await Promise.all([
    salesSummary({ ...today, groupBy: 'day' }),
    salesSummary({ ...month, groupBy: 'day' }),
    salesSummary({ ...week, groupBy: 'day' }),
    alertCounts(),
    canFinance ? profitReport(month) : null,
    canCosts ? inventoryValue() : null,
    canFinance
      ? Purchase.find({ status: 'received', paymentStatus: { $in: ['pending', 'partial'] } }).select('total amountPaid dueDate')
      : null,
  ]);

  const now = Date.now();
  const data = {
    today: { sales: todaySales.totals.sales, count: todaySales.totals.count },
    month: { sales: monthSales.totals.sales, count: monthSales.totals.count, averageTicket: monthSales.totals.averageTicket },
    last7Days: last7.series,
    byPaymentMethod: monthSales.byPaymentMethod,
    alerts,
  };

  if (profit) {
    data.finance = {
      grossProfit: profit.grossProfit,
      grossMarginPct: profit.grossMarginPct,
      expenses: profit.expenses.total,
      netProfit: profit.netProfit,
      payables: {
        total: round2(payables.reduce((sum, p) => sum + p.balanceDue, 0)),
        overdue: round2(payables.filter((p) => p.dueDate && p.dueDate.getTime() < now).reduce((sum, p) => sum + p.balanceDue, 0)),
      },
    };
  }
  if (value) data.inventory = value;
  return data;
}
