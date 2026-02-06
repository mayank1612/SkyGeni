// =============================================================================
// Database Entity Types (matching JSON structure)
// =============================================================================

export interface Account {
  account_id: string;
  name: string;
  industry: string;
  segment: 'SMB' | 'Mid-Market' | 'Enterprise';
}

export interface Rep {
  rep_id: string;
  name: string;
}

export interface Deal {
  deal_id: string;
  account_id: string;
  rep_id: string;
  stage: 'Prospecting' | 'Qualification' | 'Proposal' | 'Negotiation' | 'Closed Won' | 'Closed Lost';
  amount: number | null;
  created_at: string;
  closed_at: string | null;
}

export interface Activity {
  activity_id: string;
  deal_id: string;
  type: 'call' | 'email' | 'demo';
  timestamp: string;
}

export interface Target {
  month: string; // YYYY-MM format
  target: number;
}

// =============================================================================
// API Response Types
// =============================================================================

export interface QuarterInfo {
  quarter: string;      // "Q1 2026"
  year: number;
  quarterNum: number;   // 1-4
  startDate: string;    // "2026-01-01"
  endDate: string;      // "2026-04-01"
  months: string[];     // ["2026-01", "2026-02", "2026-03"]
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

export interface TrendDataPoint {
  month: string;
  monthLabel: string;
  year: number;
  actual: number;
  target: number;
  gapPercent: number;
}

// /api/drivers response
export interface DriverMetric {
  current: number;
  benchmark: number;
  percentOfBenchmark: number;
  previousValue: number;
  change: number;        // Percent change for most, absolute for win rate, days for cycle
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

// =============================================================================
// Query Parameters
// =============================================================================

export interface QueryParams {
  quarter?: string;      // "Q1 2026"
  compareWith?: string;  // "Q4 2025"
}
