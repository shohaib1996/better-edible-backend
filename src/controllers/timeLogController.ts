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
    const { startDate, endDate } = req.query;
    const query: any = { rep: req.params.repId };

    if (startDate || endDate) {
      query.checkinTime = {};
      if (startDate) {
        const start = new Date(startDate as string);
        start.setUTCHours(0, 0, 0, 0);
        query.checkinTime.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate as string);
        end.setUTCHours(23, 59, 59, 999);
        query.checkinTime.$lte = end;
      }
    }

    const timeLogs = await TimeLog.find(query).populate('rep');

    if (!timeLogs || timeLogs.length === 0) {
      if (startDate || endDate) {
        return res.status(200).json({ message: 'Time logs not available for the selected date range', data: [] });
      }
      return res.status(200).json({ message: 'No time logs found for this rep', data: [] });
    }

    res.status(200).json({ message: 'Time logs found successfully', data: timeLogs });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching time logs', error });
  }
};

