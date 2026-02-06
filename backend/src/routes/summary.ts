import { Router, Request, Response } from 'express';
import { calculateSummary } from '../services/calculations';
import { getAvailableQuarters } from '../db/queries';

const router = Router();

// GET /api/summary
router.get('/', (req: Request, res: Response) => {
  try {
    const quarter = (req.query.quarter as string) || 'Q1 2026';
    const compareWith = req.query.compareWith as string | undefined;

    const summary = calculateSummary(quarter, compareWith);
    res.json(summary);
  } catch (error) {
    console.error('Error in /api/summary:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to calculate summary',
    });
  }
});

// GET /api/quarters - Get available quarters for dropdown
router.get('/quarters', (_req: Request, res: Response) => {
  try {
    const quarters = getAvailableQuarters();
    res.json({ quarters });
  } catch (error) {
    console.error('Error in /api/quarters:', error);
    res.status(500).json({
      error: 'Failed to get available quarters',
    });
  }
});

export default router;
