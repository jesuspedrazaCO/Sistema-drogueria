import { asyncHandler } from '../utils/asyncHandler.js';
import * as expenseService from '../services/expenseService.js';

const requestMeta = (req) => ({ ip: req.ip, userAgent: req.get('user-agent') });

export const list = asyncHandler(async (req, res) => {
  res.json({ status: 'success', data: await expenseService.listExpenses(req.query) });
});

export const summary = asyncHandler(async (req, res) => {
  res.json({ status: 'success', data: await expenseService.expenseSummary(req.query) });
});

export const getOne = asyncHandler(async (req, res) => {
  res.json({ status: 'success', data: { expense: await expenseService.getExpense(req.params.id) } });
});

export const create = asyncHandler(async (req, res) => {
  const expense = await expenseService.createExpense(req.body, req.user, requestMeta(req));
  res.status(201).json({ status: 'success', data: { expense } });
});

export const update = asyncHandler(async (req, res) => {
  const expense = await expenseService.updateExpense(req.params.id, req.body, req.user, requestMeta(req));
  res.json({ status: 'success', data: { expense } });
});

export const voidOne = asyncHandler(async (req, res) => {
  const expense = await expenseService.voidExpense(req.params.id, req.body, req.user, requestMeta(req));
  res.json({ status: 'success', data: { expense } });
});
