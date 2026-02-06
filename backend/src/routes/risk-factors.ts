import { Router, Request, Response } from 'express';
import { calculateRiskFactors } from '../services/calculations';

const router = Router();

// GET /api/risk-factors
router.get('/', (req: Request, res: Response) => {
  try {
    const quarter = (req.query.quarter as string) || 'Q1 2026';

    const riskFactors = calculateRiskFactors(quarter);
    res.json(riskFactors);
  } catch (error) {
    console.error('Error in /api/risk-factors:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to calculate risk factors',
    });
  }
});

export default router;
