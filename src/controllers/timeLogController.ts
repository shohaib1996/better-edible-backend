// src/controllers/timeLogController.ts
import { Request, Response } from 'express';
import { TimeLog } from '../models/TimeLog';

// Helper function to convert YYYY-MM-DD to UTC Date
function parseDate(dateStr: string, endOfDay: boolean = false): Date {
  const date = new Date(dateStr);
  if (endOfDay) {
    date.setUTCHours(23, 59, 59, 999);
  } else {
    date.setUTCHours(0, 0, 0, 0);
  }
  return date;
}

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
        query.checkinTime.$gte = parseDate(startDate as string, false);
      }
      if (endDate) {
        query.checkinTime.$lte = parseDate(endDate as string, true);
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

// GET time logs summary for all reps
export const getTimeLogsSummary = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const query: any = {};

    if (startDate || endDate) {
      query.checkinTime = {};
      if (startDate) {
        query.checkinTime.$gte = parseDate(startDate as string, false);
      }
      if (endDate) {
        query.checkinTime.$lte = parseDate(endDate as string, true);
      }
    }

    const timeLogs = await TimeLog.find(query).populate('rep');

    if (!timeLogs || timeLogs.length === 0) {
      return res.status(200).json({
        message: 'No time logs found for the selected date range',
        data: []
      });
    }

    // Group by rep and calculate hours
    const summaryMap = new Map();

    timeLogs.forEach((log: any) => {
      // Skip if rep is null (deleted rep)
      if (!log.rep) return;

      const repId = log.rep._id.toString();
      const repName = log.rep.name;

      if (!summaryMap.has(repId)) {
        summaryMap.set(repId, {
          repId,
          repName,
          repEmail: log.rep.email,
          repPhone: log.rep.phone,
          repType: log.rep.repType,
          totalHours: 0,
          totalMinutes: 0,
          daysWorked: 0,
          logs: []
        });
      }

      const summary = summaryMap.get(repId);

      if (log.checkoutTime) {
        const checkinTime = new Date(log.checkinTime);
        const checkoutTime = new Date(log.checkoutTime);
        const diffMs = checkoutTime.getTime() - checkinTime.getTime();
        const diffMinutes = Math.floor(diffMs / 60000);
        const hours = Math.floor(diffMinutes / 60);
        const minutes = diffMinutes % 60;

        // Get date in YYYY-MM-DD format
        const dateKey = checkinTime.toISOString().split('T')[0];

        summary.totalMinutes += diffMinutes;
        summary.daysWorked += 1;
        summary.logs.push({
          date: dateKey,
          checkinTime: log.checkinTime,
          checkoutTime: log.checkoutTime,
          hoursWorked: hours,
          minutesWorked: minutes,
          totalMinutes: diffMinutes
        });
      } else {
        // Get date in YYYY-MM-DD format
        const dateKey = new Date(log.checkinTime).toISOString().split('T')[0];

        summary.logs.push({
          date: dateKey,
          checkinTime: log.checkinTime,
          checkoutTime: null,
          hoursWorked: 0,
          minutesWorked: 0,
          totalMinutes: 0,
          status: 'Still checked in'
        });
      }
    });

    // Convert total minutes to hours and minutes
    const summary = Array.from(summaryMap.values()).map(rep => {
      const totalHours = Math.floor(rep.totalMinutes / 60);
      const remainingMinutes = rep.totalMinutes % 60;

      return {
        repId: rep.repId,
        repName: rep.repName,
        repEmail: rep.repEmail,
        repPhone: rep.repPhone,
        repType: rep.repType,
        totalHours,
        totalMinutes: remainingMinutes,
        totalMinutesWorked: rep.totalMinutes,
        formattedTotalTime: `${totalHours}h ${remainingMinutes}m`,
        daysWorked: rep.daysWorked,
        logs: rep.logs
      };
    });

    res.status(200).json({
      message: 'Time logs summary retrieved successfully',
      dateRange: {
        startDate: startDate || 'All time',
        endDate: endDate || 'All time'
      },
      totalReps: summary.length,
      data: summary
    });
  } catch (error) {
    console.error('Error in getTimeLogsSummary:', error);
    res.status(500).json({ message: 'Error fetching time logs summary', error: (error as Error).message });
  }
};

// GET time logs summary for a specific rep
export const getTimeLogsSummaryByRepId = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const query: any = { rep: req.params.repId };

    if (startDate || endDate) {
      query.checkinTime = {};
      if (startDate) {
        query.checkinTime.$gte = parseDate(startDate as string, false);
      }
      if (endDate) {
        query.checkinTime.$lte = parseDate(endDate as string, true);
      }
    }

    const timeLogs = await TimeLog.find(query).populate('rep');

    if (!timeLogs || timeLogs.length === 0) {
      return res.status(200).json({
        message: 'No time logs found for this rep in the selected date range',
        data: null
      });
    }

    let totalMinutes = 0;
    const logs: any[] = [];
    const dailySummary = new Map();

    timeLogs.forEach((log: any) => {
      // Get date in YYYY-MM-DD format
      const dateKey = new Date(log.checkinTime).toISOString().split('T')[0];

      if (log.checkoutTime) {
        const checkinTime = new Date(log.checkinTime);
        const checkoutTime = new Date(log.checkoutTime);
        const diffMs = checkoutTime.getTime() - checkinTime.getTime();
        const diffMinutes = Math.floor(diffMs / 60000);
        const hours = Math.floor(diffMinutes / 60);
        const minutes = diffMinutes % 60;

        totalMinutes += diffMinutes;

        logs.push({
          date: dateKey,
          checkinTime: log.checkinTime,
          checkoutTime: log.checkoutTime,
          hoursWorked: hours,
          minutesWorked: minutes,
          totalMinutes: diffMinutes,
          formattedTime: `${hours}h ${minutes}m`
        });

        // Daily summary
        if (!dailySummary.has(dateKey)) {
          dailySummary.set(dateKey, { date: dateKey, totalMinutes: 0, sessions: 0 });
        }
        const daySummary = dailySummary.get(dateKey);
        daySummary.totalMinutes += diffMinutes;
        daySummary.sessions += 1;
      } else {
        logs.push({
          date: dateKey,
          checkinTime: log.checkinTime,
          checkoutTime: null,
          hoursWorked: 0,
          minutesWorked: 0,
          totalMinutes: 0,
          status: 'Still checked in',
          formattedTime: 'Still checked in'
        });
      }
    });

    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;

    // Format daily summary
    const dailySummaryArray = Array.from(dailySummary.values()).map(day => {
      const hours = Math.floor(day.totalMinutes / 60);
      const minutes = day.totalMinutes % 60;
      return {
        date: day.date,
        totalHours: hours,
        totalMinutes: minutes,
        totalMinutesWorked: day.totalMinutes,
        formattedTime: `${hours}h ${minutes}m`,
        sessions: day.sessions
      };
    });

    const repInfo: any = timeLogs[0].rep;

    res.status(200).json({
      message: 'Time logs summary retrieved successfully',
      dateRange: {
        startDate: startDate || 'All time',
        endDate: endDate || 'All time'
      },
      data: {
        repId: repInfo._id,
        repName: repInfo.name,
        repEmail: repInfo.email,
        repPhone: repInfo.phone,
        repType: repInfo.repType,
        totalHours,
        totalMinutes: remainingMinutes,
        totalMinutesWorked: totalMinutes,
        formattedTotalTime: `${totalHours}h ${remainingMinutes}m`,
        daysWorked: dailySummary.size,
        dailySummary: dailySummaryArray,
        logs
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching time logs summary', error });
  }
};

