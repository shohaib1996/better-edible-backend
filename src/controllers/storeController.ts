// src/controllers/storeController.ts
import { Request, Response } from 'express';
import { Store } from '../models/Store';

// Get all stores (with search & pagination)
export const getAllStores = async (req: Request, res: Response) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const query: any = {};

    if (search) query.$text = { $search: search as string };

    const stores = await Store.find(query)
      .populate('reps', 'name repType territory')
      .skip((+page - 1) * +limit)
      .limit(+limit)
      .sort({ createdAt: -1 });

    const total = await Store.countDocuments(query);

    res.json({ total, page: +page, limit: +limit, stores });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stores', error });
  }
};

// Get store by ID
export const getStoreById = async (req: Request, res: Response) => {
  try {
    const store = await Store.findById(req.params.id).populate('reps', 'name repType');
    if (!store) return res.status(404).json({ message: 'Store not found' });
    res.json(store);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching store', error });
  }
};

// Create store
export const createStore = async (req: Request, res: Response) => {
  try {
    const { name, address, city, contacts, reps } = req.body;
    const existing = await Store.findOne({ name });
    if (existing) return res.status(400).json({ message: 'Store already exists' });

    const store = await Store.create({ name, address, city, contacts, reps });
    res.status(201).json(store);
  } catch (error) {
    res.status(500).json({ message: 'Error creating store', error });
  }
};

// Update store
export const updateStore = async (req: Request, res: Response) => {
  try {
    const store = await Store.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!store) return res.status(404).json({ message: 'Store not found' });
    res.json(store);
  } catch (error) {
    res.status(500).json({ message: 'Error updating store', error });
  }
};

// Block / Unblock store
export const toggleBlockStore = async (req: Request, res: Response) => {
  try {
    const { blocked } = req.body;
    const store = await Store.findByIdAndUpdate(req.params.id, { blocked }, { new: true });
    if (!store) return res.status(404).json({ message: 'Store not found' });
    res.json({ message: `Store ${blocked ? 'blocked' : 'unblocked'} successfully`, store });
  } catch (error) {
    res.status(500).json({ message: 'Error updating store block status', error });
  }
};

// Delete store
export const deleteStore = async (req: Request, res: Response) => {
  try {
    const store = await Store.findByIdAndDelete(req.params.id);
    if (!store) return res.status(404).json({ message: 'Store not found' });
    res.json({ message: 'Store deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting store', error });
  }
};
