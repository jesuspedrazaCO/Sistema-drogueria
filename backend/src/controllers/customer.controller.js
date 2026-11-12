import { asyncHandler } from '../utils/asyncHandler.js';
import * as customerService from '../services/customerService.js';

export const list = asyncHandler(async (req, res) => {
  const data = await customerService.listCustomers(req.query);
  res.json({ status: 'success', data });
});

export const getOne = asyncHandler(async (req, res) => {
  const customer = await customerService.getCustomer(req.params.id);
  res.json({ status: 'success', data: { customer } });
});

export const create = asyncHandler(async (req, res) => {
  const customer = await customerService.createCustomer(req.body);
  res.status(201).json({ status: 'success', data: { customer } });
});

export const update = asyncHandler(async (req, res) => {
  const customer = await customerService.updateCustomer(req.params.id, req.body);
  res.json({ status: 'success', data: { customer } });
});
