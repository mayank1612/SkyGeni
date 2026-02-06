import { Router, Request, Response } from 'express';
import { generateRecommendations } from '../services/calculations';

const router = Router();

// GET /api/recommendations
router.get('/', (req: Request, res: Response) => {
  try {
    const quarter = (req.query.quarter as string) || 'Q1 2026';
    const compareWith = req.query.compareWith as string | undefined;

    const recommendations = generateRecommendations(quarter, compareWith);
    res.json(recommendations);
  } catch (error) {
    console.error('Error in /api/recommendations:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to generate recommendations',
    });
  }
});

export default router;
