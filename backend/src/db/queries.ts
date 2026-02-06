import { query, queryOne } from './init';
import { QuarterInfo } from '../types';

// =============================================================================
// Utility Functions
// =============================================================================

export function parseQuarter(quarterStr: string): QuarterInfo {
  // Parse "Q1 2026" format
  const match = quarterStr.match(/Q(\d)\s+(\d{4})/);
  if (!match) {
    throw new Error(`Invalid quarter format: ${quarterStr}. Expected format: "Q1 2026"`);
  }

  const quarterNum = parseInt(match[1]);
  const year = parseInt(match[2]);

  if (quarterNum < 1 || quarterNum > 4) {
    throw new Error(`Invalid quarter number: ${quarterNum}. Must be 1-4.`);
  }

  const startMonth = (quarterNum - 1) * 3 + 1;
  const endMonth = quarterNum * 3;

  const startDate = `${year}-${String(startMonth).padStart(2, '0')}-01`;
  const endDate = quarterNum === 4
    ? `${year + 1}-01-01`
    : `${year}-${String(endMonth + 1).padStart(2, '0')}-01`;

  const months = [
    `${year}-${String(startMonth).padStart(2, '0')}`,
    `${year}-${String(startMonth + 1).padStart(2, '0')}`,
    `${year}-${String(startMonth + 2).padStart(2, '0')}`,
  ];

  return {
    quarter: quarterStr,
    year,
    quarterNum,
    startDate,
    endDate,
    months,
  };
}

export function getPreviousQuarter(quarterInfo: QuarterInfo): QuarterInfo {
  const { year, quarterNum } = quarterInfo;
  if (quarterNum === 1) {
    return parseQuarter(`Q4 ${year - 1}`);
  }
  return parseQuarter(`Q${quarterNum - 1} ${year}`);
}

export function getAvailableQuarters(): string[] {
  const result = query<{ quarter: string }>(`
    SELECT DISTINCT
      CASE
        WHEN CAST(strftime('%m', COALESCE(closed_at, created_at)) AS INTEGER) BETWEEN 1 AND 3 THEN 'Q1 ' || strftime('%Y', COALESCE(closed_at, created_at))
        WHEN CAST(strftime('%m', COALESCE(closed_at, created_at)) AS INTEGER) BETWEEN 4 AND 6 THEN 'Q2 ' || strftime('%Y', COALESCE(closed_at, created_at))
        WHEN CAST(strftime('%m', COALESCE(closed_at, created_at)) AS INTEGER) BETWEEN 7 AND 9 THEN 'Q3 ' || strftime('%Y', COALESCE(closed_at, created_at))
        ELSE 'Q4 ' || strftime('%Y', COALESCE(closed_at, created_at))
      END as quarter
    FROM deals
    WHERE COALESCE(closed_at, created_at) IS NOT NULL
    ORDER BY strftime('%Y', COALESCE(closed_at, created_at)) DESC,
             CASE
               WHEN CAST(strftime('%m', COALESCE(closed_at, created_at)) AS INTEGER) BETWEEN 1 AND 3 THEN 1
               WHEN CAST(strftime('%m', COALESCE(closed_at, created_at)) AS INTEGER) BETWEEN 4 AND 6 THEN 2
               WHEN CAST(strftime('%m', COALESCE(closed_at, created_at)) AS INTEGER) BETWEEN 7 AND 9 THEN 3
               ELSE 4
             END DESC
  `);

  return [...new Set(result.map(r => r.quarter))];
}

// =============================================================================
// Summary Queries
// =============================================================================

export function getQuarterRevenue(quarterInfo: QuarterInfo): number {
  const result = queryOne<{ revenue: number }>(`
    SELECT COALESCE(SUM(amount), 0) as revenue
    FROM deals
    WHERE stage = 'Closed Won'
      AND amount IS NOT NULL
      AND COALESCE(closed_at, created_at) >= ?
      AND COALESCE(closed_at, created_at) < ?
  `, [quarterInfo.startDate, quarterInfo.endDate]);

  return result?.revenue ?? 0;
}

export function getQuarterTarget(quarterInfo: QuarterInfo): number {
  const result = queryOne<{ total_target: number }>(`
    SELECT COALESCE(SUM(target), 0) as total_target
    FROM targets
    WHERE month IN (?, ?, ?)
  `, quarterInfo.months);

  return result?.total_target ?? 0;
}

export function getMonthlyTrend(months: number = 6, referenceDate: string = '2026-01-15'): Array<{
  month: string;
  actual: number;
  target: number;
}> {
  const result = query<{ month: string; actual: number; target: number }>(`
    WITH last_months AS (
      SELECT DISTINCT month
      FROM targets
      WHERE month <= strftime('%Y-%m', ?)
      ORDER BY month DESC
      LIMIT ?
    )
    SELECT
      t.month,
      t.target,
      COALESCE(SUM(d.amount), 0) as actual
    FROM targets t
    LEFT JOIN deals d ON
      strftime('%Y-%m', COALESCE(d.closed_at, d.created_at)) = t.month
      AND d.stage = 'Closed Won'
      AND d.amount IS NOT NULL
    WHERE t.month IN (SELECT month FROM last_months)
    GROUP BY t.month
    ORDER BY t.month ASC
  `, [referenceDate, months]);

  return result;
}

// =============================================================================
// Drivers Queries
// =============================================================================

export function getPipelineValue(): number {
  const result = queryOne<{ pipeline: number }>(`
    SELECT COALESCE(SUM(amount), 0) as pipeline
    FROM deals
    WHERE stage NOT IN ('Closed Won', 'Closed Lost')
      AND amount IS NOT NULL
  `);

  return result?.pipeline ?? 0;
}

export function getWinRate(quarterInfo: QuarterInfo): { won: number; lost: number; rate: number } {
  const result = queryOne<{ won: number; lost: number }>(`
    SELECT
      COUNT(CASE WHEN stage = 'Closed Won' THEN 1 END) as won,
      COUNT(CASE WHEN stage = 'Closed Lost' THEN 1 END) as lost
    FROM deals
    WHERE stage IN ('Closed Won', 'Closed Lost')
      AND COALESCE(closed_at, created_at) >= ?
      AND COALESCE(closed_at, created_at) < ?
  `, [quarterInfo.startDate, quarterInfo.endDate]);

  const won = result?.won ?? 0;
  const lost = result?.lost ?? 0;
  const total = won + lost;
  const rate = total > 0 ? (won / total) * 100 : 0;

  return { won, lost, rate };
}

export function getAvgDealSize(quarterInfo: QuarterInfo): number {
  const result = queryOne<{ avg_size: number }>(`
    SELECT COALESCE(AVG(amount), 0) as avg_size
    FROM deals
    WHERE stage = 'Closed Won'
      AND amount IS NOT NULL
      AND COALESCE(closed_at, created_at) >= ?
      AND COALESCE(closed_at, created_at) < ?
  `, [quarterInfo.startDate, quarterInfo.endDate]);

  return result?.avg_size ?? 0;
}

export function getHistoricalAvgDealSize(beforeDate: string): number {
  const result = queryOne<{ avg_size: number }>(`
    SELECT COALESCE(AVG(amount), 0) as avg_size
    FROM deals
    WHERE stage = 'Closed Won'
      AND amount IS NOT NULL
      AND COALESCE(closed_at, created_at) < ?
  `, [beforeDate]);

  return result?.avg_size || 20000; // Default benchmark if no history
}

export function getSalesCycle(quarterInfo: QuarterInfo): number {
  const result = queryOne<{ avg_cycle: number }>(`
    SELECT COALESCE(AVG(
      JULIANDAY(closed_at) - JULIANDAY(created_at)
    ), 0) as avg_cycle
    FROM deals
    WHERE stage = 'Closed Won'
      AND closed_at IS NOT NULL
      AND created_at IS NOT NULL
      AND COALESCE(closed_at, created_at) >= ?
      AND COALESCE(closed_at, created_at) < ?
  `, [quarterInfo.startDate, quarterInfo.endDate]);

  return Math.round(result?.avg_cycle ?? 0);
}

// =============================================================================
// Risk Factors Queries
// =============================================================================

export function getStaleDeals(thresholdDays: number = 30, referenceDate: string = '2026-01-15'): Array<{
  deal_id: string;
  account_id: string;
  account_name: string;
  segment: string;
  amount: number | null;
  stage: string;
  days_since_activity: number;
  last_activity: string | null;
}> {
  const result = query<{
    deal_id: string;
    account_id: string;
    account_name: string;
    segment: string;
    amount: number | null;
    stage: string;
    days_since_activity: number;
    last_activity: string | null;
  }>(`
    SELECT
      d.deal_id,
      d.account_id,
      COALESCE(a.name, 'Unknown Account') as account_name,
      COALESCE(a.segment, 'Unknown') as segment,
      d.amount,
      d.stage,
      CAST(JULIANDAY(?) - JULIANDAY(COALESCE(MAX(act.timestamp), d.created_at)) AS INTEGER) as days_since_activity,
      MAX(act.timestamp) as last_activity
    FROM deals d
    LEFT JOIN activities act ON d.deal_id = act.deal_id
    LEFT JOIN accounts a ON d.account_id = a.account_id
    WHERE d.stage NOT IN ('Closed Won', 'Closed Lost')
    GROUP BY d.deal_id
    HAVING days_since_activity > ?
    ORDER BY d.amount DESC NULLS LAST
  `, [referenceDate, thresholdDays]);

  return result;
}

export function getUnderperformingReps(quarterInfo: QuarterInfo, minDeals: number = 3): {
  teamAvgWinRate: number;
  reps: Array<{
    rep_id: string;
    name: string;
    won: number;
    lost: number;
    win_rate: number;
  }>;
} {
  // Get team average first
  const teamStats = queryOne<{ total_won: number; total_lost: number }>(`
    SELECT
      COUNT(CASE WHEN stage = 'Closed Won' THEN 1 END) as total_won,
      COUNT(CASE WHEN stage = 'Closed Lost' THEN 1 END) as total_lost
    FROM deals
    WHERE stage IN ('Closed Won', 'Closed Lost')
      AND COALESCE(closed_at, created_at) >= ?
      AND COALESCE(closed_at, created_at) < ?
  `, [quarterInfo.startDate, quarterInfo.endDate]);

  const totalWon = teamStats?.total_won ?? 0;
  const totalLost = teamStats?.total_lost ?? 0;
  const teamTotal = totalWon + totalLost;
  const teamAvgWinRate = teamTotal > 0 ? (totalWon / teamTotal) * 100 : 0;

  // Get individual rep performance
  const reps = query<{
    rep_id: string;
    name: string;
    won: number;
    lost: number;
  }>(`
    SELECT
      r.rep_id,
      r.name,
      COUNT(CASE WHEN d.stage = 'Closed Won' THEN 1 END) as won,
      COUNT(CASE WHEN d.stage = 'Closed Lost' THEN 1 END) as lost
    FROM reps r
    LEFT JOIN deals d ON r.rep_id = d.rep_id
      AND d.stage IN ('Closed Won', 'Closed Lost')
      AND COALESCE(d.closed_at, d.created_at) >= ?
      AND COALESCE(d.closed_at, d.created_at) < ?
    GROUP BY r.rep_id, r.name
    HAVING (won + lost) >= ?
    ORDER BY (CAST(won AS REAL) / NULLIF(won + lost, 0)) ASC
  `, [quarterInfo.startDate, quarterInfo.endDate, minDeals]);

  const repsWithRate = reps.map(r => ({
    ...r,
    win_rate: r.won + r.lost > 0 ? (r.won / (r.won + r.lost)) * 100 : 0,
  })).filter(r => r.win_rate < teamAvgWinRate);

  return { teamAvgWinRate, reps: repsWithRate };
}

export function getLowActivityAccounts(thresholdDays: number = 14, referenceDate: string = '2026-01-15'): Array<{
  account_id: string;
  name: string;
  segment: string;
  pipeline_value: number;
  open_deal_count: number;
  days_since_activity: number;
  last_activity: string | null;
}> {
  const result = query<{
    account_id: string;
    name: string;
    segment: string;
    pipeline_value: number;
    open_deal_count: number;
    days_since_activity: number;
    last_activity: string | null;
  }>(`
    SELECT
      a.account_id,
      a.name,
      COALESCE(a.segment, 'Unknown') as segment,
      COALESCE(SUM(d.amount), 0) as pipeline_value,
      COUNT(DISTINCT d.deal_id) as open_deal_count,
      CAST(JULIANDAY(?) - JULIANDAY(COALESCE(MAX(act.timestamp), MIN(d.created_at))) AS INTEGER) as days_since_activity,
      MAX(act.timestamp) as last_activity
    FROM accounts a
    JOIN deals d ON a.account_id = d.account_id
    LEFT JOIN activities act ON d.deal_id = act.deal_id
    WHERE d.stage NOT IN ('Closed Won', 'Closed Lost')
    GROUP BY a.account_id
    HAVING days_since_activity > ?
    ORDER BY pipeline_value DESC
  `, [referenceDate, thresholdDays]);

  return result;
}

// =============================================================================
// Additional Helpers for Recommendations
// =============================================================================

export function getSegmentWinRates(quarterInfo: QuarterInfo): Array<{
  segment: string;
  won: number;
  lost: number;
  win_rate: number;
}> {
  const result = query<{
    segment: string;
    won: number;
    lost: number;
  }>(`
    SELECT
      COALESCE(a.segment, 'Unknown') as segment,
      COUNT(CASE WHEN d.stage = 'Closed Won' THEN 1 END) as won,
      COUNT(CASE WHEN d.stage = 'Closed Lost' THEN 1 END) as lost
    FROM deals d
    LEFT JOIN accounts a ON d.account_id = a.account_id
    WHERE d.stage IN ('Closed Won', 'Closed Lost')
      AND COALESCE(d.closed_at, d.created_at) >= ?
      AND COALESCE(d.closed_at, d.created_at) < ?
    GROUP BY a.segment
  `, [quarterInfo.startDate, quarterInfo.endDate]);

  return result.map(r => ({
    ...r,
    win_rate: r.won + r.lost > 0 ? (r.won / (r.won + r.lost)) * 100 : 0,
  }));
}
