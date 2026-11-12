import { asyncHandler } from '../utils/asyncHandler.js';
import * as userService from '../services/userService.js';

const requestMeta = (req) => ({ ip: req.ip, userAgent: req.get('user-agent') });

export const list = asyncHandler(async (req, res) => {
  const data = await userService.listUsers(req.query);
  res.json({ status: 'success', data });
});

export const getOne = asyncHandler(async (req, res) => {
  const user = await userService.getUser(req.params.id);
  res.json({ status: 'success', data: { user } });
});

export const create = asyncHandler(async (req, res) => {
  const { user, emailSent } = await userService.createUser(req.body, req.user, requestMeta(req));
  res.status(201).json({ status: 'success', data: { user, emailSent } });
});

export const update = asyncHandler(async (req, res) => {
  const user = await userService.updateUser(req.params.id, req.body, req.user, requestMeta(req));
  res.json({ status: 'success', data: { user } });
});

export const resendInvite = asyncHandler(async (req, res) => {
  const data = await userService.resendInvite(req.params.id, req.user, requestMeta(req));
  res.json({ status: 'success', data });
});
