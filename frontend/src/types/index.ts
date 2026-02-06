// =============================================================================
// API Response Types
// =============================================================================

export interface TrendDataPoint {
  month: string;
  monthLabel: string;
  year: number;
  actual: number;
  target: number;
  gapPercent: number;
}

// /api/summary response
export interface SummaryResponse {
  quarter: string;
  revenue: number;
  target: number;
  gapPercent: number;
  gapAmount: number;
  previousRevenue: number;
  changePercent: number;
  comparisonPeriod: string;
  trend: TrendDataPoint[];
}

// /api/drivers response
export interface DriverMetric {
  current: number;
  benchmark: number;
  percentOfBenchmark: number;
  previousValue: number;
  change: number;
  changeType: 'percent' | 'absolute' | 'days';
  isPositiveGood: boolean;
  tooltip: string;
}

export interface DriversResponse {
  quarter: string;
  comparisonPeriod: string;
  pipelineValue: DriverMetric;
  winRate: DriverMetric;
  avgDealSize: DriverMetric;
  salesCycle: DriverMetric;
}

// /api/risk-factors response
export interface StaleDeal {
  dealId: string;
  accountName: string;
  accountId: string;
  segment: string;
  amount: number | null;
  daysSinceActivity: number;
  lastActivityDate: string | null;
  stage: string;
}

export interface SegmentSummary {
  segment: string;
  count: number;
  valueAtRisk: number;
}

export interface UnderperformingRep {
  repId: string;
  name: string;
  winRate: number;
  teamAvgWinRate: number;
  gapFromAverage: number;
  wonDeals: number;
  lostDeals: number;
  totalDeals: number;
}

export interface LowActivityAccount {
  accountId: string;
  name: string;
  segment: string;
  pipelineValue: number;
  openDealCount: number;
  daysSinceActivity: number;
  lastActivityDate: string | null;
}

export interface RiskFactorsResponse {
  quarter: string;
  staleDeals: {
    totalCount: number;
    totalValueAtRisk: number;
    thresholdDays: number;
    bySegment: SegmentSummary[];
    deals: StaleDeal[];
  };
  underperformingReps: {
    teamAvgWinRate: number;
    count: number;
    reps: UnderperformingRep[];
  };
  lowActivityAccounts: {
    totalCount: number;
    totalValueAtRisk: number;
    thresholdDays: number;
    accounts: LowActivityAccount[];
  };
}

// /api/recommendations response
export interface Recommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  category: 'pipeline' | 'coaching' | 'engagement' | 'process' | 'analysis';
  relatedEntities?: {
    type: 'deal' | 'rep' | 'account' | 'segment';
    ids: string[];
    names: string[];
  };
}

export interface RecommendationsResponse {
  quarter: string;
  recommendations: Recommendation[];
  generatedAt: string;
}

// Quarters response
export interface QuartersResponse {
  quarters: string[];
}
