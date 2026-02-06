import { Router, Request, Response } from 'express';
import { calculateDrivers } from '../services/calculations';

const router = Router();

// GET /api/drivers
router.get('/', (req: Request, res: Response) => {
  try {
    const quarter = (req.query.quarter as string) || 'Q1 2026';
    const compareWith = req.query.compareWith as string | undefined;

    const drivers = calculateDrivers(quarter, compareWith);
    res.json(drivers);
  } catch (error) {
    console.error('Error in /api/drivers:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to calculate drivers',
    });
  }
});

export default router;
