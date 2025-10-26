// src/controllers/timeLogController.ts
import { Request, Response } from 'express';
import { TimeLog } from '../models/TimeLog';

// GET all time logs
export const getAllTimeLogs = async (req: Request, res: Response) => {
  try {
    const timeLogs = await TimeLog.find().populate('rep');
    res.json(timeLogs);
  } catch (error) { 
    res.status(500).json({ message: 'Error fetching time logs', error });
  }
};

// GET one time log
export const getTimeLogById = async (req: Request, res: Response) => {
  try {
    const timeLog = await TimeLog.findById(req.params.id).populate('rep');
    if (!timeLog) return res.status(404).json({ message: 'Time log not found' });
    res.json(timeLog);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching time log', error });
  }
};

// GET time logs by rep ID
export const getTimeLogsByRepId = async (req: Request, res: Response) => {
  try {
    const timeLogs = await TimeLog.find({ rep: req.params.repId }).populate('rep');
    if (!timeLogs) return res.status(404).json({ message: 'Time logs not found for this rep' });
    res.json(timeLogs);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching time logs', error });
  }
};

