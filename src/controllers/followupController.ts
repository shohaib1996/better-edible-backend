
import { Request, Response } from 'express';
import { Followup } from '../models/Followup';
import { Store } from '../models/Store';

// Get all followups
export const getAllFollowups = async (req: Request, res: Response) => {
  try {
    const { storeId, repId, page = 1, limit = 20, storeName, date } = req.query;
    const query: any = {};

    if (storeId) query.store = storeId;
    if (repId) query.rep = repId;

    // Search by store name
    if (storeName) {
      const stores = await Store.find({ name: { $regex: storeName, $options: 'i' } });
      const storeIds = stores.map(store => store._id);
      query.store = { $in: storeIds };
    }

    // Search by date
    if (date) {
      const searchDate = new Date(date as string);
      searchDate.setUTCHours(0, 0, 0, 0);
      const nextDay = new Date(searchDate);
      nextDay.setUTCDate(searchDate.getUTCDate() + 1);
      query.followupDate = {
        $gte: searchDate,
        $lt: nextDay,
      };
    }

    const followups = await Followup.find(query)
      .populate('store', 'name')
      .populate('rep', 'name')
      .skip((+page - 1) * +limit)
      .limit(+limit);
      
    const total = await Followup.countDocuments(query);

    res.json({ total, page: +page, limit: +limit, followups });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching followups', error });
  }
};

// Get followup by ID
export const getFollowupById = async (req: Request, res: Response) => {
  try {
    const followup = await Followup.findById(req.params.id)
      .populate('store', 'name')
      .populate('rep', 'name');
    if (!followup) return res.status(404).json({ message: 'Followup not found' });
    res.json(followup);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching followup', error });
  }
};

// Create followup
export const createFollowup = async (req: Request, res: Response) => {
  try {
    const { followupDate, interestLevel, comments, store, rep } = req.body;
    const newFollowup = await Followup.create({ followupDate, interestLevel, comments, store, rep });
    res.status(201).json(newFollowup);
  } catch (error) {
    res.status(500).json({ message: 'Error creating followup', error });
  }
};

// Update followup
export const updateFollowup = async (req: Request, res: Response) => {
  try {
    const followup = await Followup.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!followup) return res.status(404).json({ message: 'Followup not found' });
    res.json(followup);
  } catch (error) {
    res.status(500).json({ message: 'Error updating followup', error });
  }
};

// Delete followup
export const deleteFollowup = async (req: Request, res: Response) => {
  try {
    const followup = await Followup.findByIdAndDelete(req.params.id);
    if (!followup) return res.status(404).json({ message: 'Followup not found' });
    res.json({ message: 'Followup deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting followup', error });
  }
};
