import {
  QuarterInfo,
  SummaryResponse,
  TrendDataPoint,
  DriversResponse,
  DriverMetric,
  RiskFactorsResponse,
  RecommendationsResponse,
  Recommendation,
  StaleDeal,
  SegmentSummary,
  UnderperformingRep,
  LowActivityAccount,
} from '../types';

import {
  parseQuarter,
  getPreviousQuarter,
  getQuarterRevenue,
  getQuarterTarget,
  getMonthlyTrend,
  getPipelineValue,
  getWinRate,
  getAvgDealSize,
  getHistoricalAvgDealSize,
  getSalesCycle,
  getStaleDeals,
  getUnderperformingReps,
  getLowActivityAccounts,
  getSegmentWinRates,
} from '../db/queries';

// =============================================================================
// Constants
// =============================================================================

const REFERENCE_DATE = '2026-01-15'; // Current date for calculations
const STALE_THRESHOLD_DAYS = 30;
const LOW_ACTIVITY_THRESHOLD_DAYS = 14;
const MIN_DEALS_FOR_REP_ANALYSIS = 3;

// Benchmarks
const WIN_RATE_BENCHMARK = 25; // 25%
const SALES_CYCLE_BENCHMARK = 45; // 45 days
const PIPELINE_COVERAGE_MULTIPLIER = 3; // 3x target

// =============================================================================
// Tooltip Messages
// =============================================================================

const TOOLTIPS = {
  pipelineValue: 'Total value of deals currently in progress (not yet won or lost). Healthy pipeline should be 3× your quarterly target for adequate coverage.',
  winRate: 'Percentage of closed deals that were won. Calculated as: Won Deals ÷ (Won + Lost Deals). Industry benchmark is 25%. Deals still in progress are not included.',
  avgDealSize: 'Average revenue per closed-won deal this quarter. Compared against your historical average from past quarters. Higher values indicate moving upmarket or better negotiation.',
  salesCycle: 'Average number of days from deal creation to close for won deals. Shorter cycles indicate efficient sales process. Benchmark is 45 days for mixed SMB/Mid-Market portfolio.',
};

// =============================================================================
// Helper Functions
// =============================================================================

function formatMonthLabel(month: string): string {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthNum = parseInt(month.split('-')[1]) - 1;
  return monthNames[monthNum];
}

function calculatePercentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function roundToDecimal(value: number, decimals: number = 1): number {
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
}

// =============================================================================
// Summary Service
// =============================================================================

export function calculateSummary(quarter: string, compareWith?: string): SummaryResponse {
  const quarterInfo = parseQuarter(quarter);
  const comparisonQuarter = compareWith
    ? parseQuarter(compareWith)
    : getPreviousQuarter(quarterInfo);

  const revenue = getQuarterRevenue(quarterInfo);
  const target = getQuarterTarget(quarterInfo);
  const previousRevenue = getQuarterRevenue(comparisonQuarter);

  const gapAmount = revenue - target;
  const gapPercent = target > 0 ? roundToDecimal((gapAmount / target) * 100) : 0;
  const changePercent = roundToDecimal(calculatePercentChange(revenue, previousRevenue));

  // Get trend data
  const trendData = getMonthlyTrend(6, REFERENCE_DATE);
  const trend: TrendDataPoint[] = trendData.map(t => ({
    month: t.month,
    monthLabel: formatMonthLabel(t.month),
    year: parseInt(t.month.split('-')[0]),
    actual: t.actual,
    target: t.target,
    gapPercent: t.target > 0 ? roundToDecimal(((t.actual - t.target) / t.target) * 100) : 0,
  }));

  return {
    quarter,
    revenue: roundToDecimal(revenue, 0),
    target: roundToDecimal(target, 0),
    gapPercent,
    gapAmount: roundToDecimal(gapAmount, 0),
    previousRevenue: roundToDecimal(previousRevenue, 0),
    changePercent,
    comparisonPeriod: comparisonQuarter.quarter,
    trend,
  };
}

// =============================================================================
// Drivers Service
// =============================================================================

export function calculateDrivers(quarter: string, compareWith?: string): DriversResponse {
  const quarterInfo = parseQuarter(quarter);
  const comparisonQuarter = compareWith
    ? parseQuarter(compareWith)
    : getPreviousQuarter(quarterInfo);

  const quarterTarget = getQuarterTarget(quarterInfo);

  // Pipeline Value
  const currentPipeline = getPipelineValue();
  const pipelineBenchmark = quarterTarget * PIPELINE_COVERAGE_MULTIPLIER;

  // For previous pipeline, we approximate (pipeline doesn't change historically in our data)
  // In a real system, you'd track pipeline snapshots over time
  const previousPipeline = currentPipeline * 0.9; // Approximation for demo

  const pipelineValue: DriverMetric = {
    current: roundToDecimal(currentPipeline, 0),
    benchmark: roundToDecimal(pipelineBenchmark, 0),
    percentOfBenchmark: pipelineBenchmark > 0
      ? roundToDecimal((currentPipeline / pipelineBenchmark) * 100)
      : 0,
    previousValue: roundToDecimal(previousPipeline, 0),
    change: roundToDecimal(calculatePercentChange(currentPipeline, previousPipeline)),
    changeType: 'percent',
    isPositiveGood: true,
    tooltip: TOOLTIPS.pipelineValue,
  };

  // Win Rate
  const currentWinRate = getWinRate(quarterInfo);
  const previousWinRate = getWinRate(comparisonQuarter);

  const winRate: DriverMetric = {
    current: roundToDecimal(currentWinRate.rate),
    benchmark: WIN_RATE_BENCHMARK,
    percentOfBenchmark: roundToDecimal((currentWinRate.rate / WIN_RATE_BENCHMARK) * 100),
    previousValue: roundToDecimal(previousWinRate.rate),
    change: roundToDecimal(currentWinRate.rate - previousWinRate.rate), // Absolute change for rates
    changeType: 'absolute',
    isPositiveGood: true,
    tooltip: TOOLTIPS.winRate,
  };

  // Avg Deal Size
  const currentAvgDeal = getAvgDealSize(quarterInfo);
  const previousAvgDeal = getAvgDealSize(comparisonQuarter);
  const historicalAvgDeal = getHistoricalAvgDealSize(quarterInfo.startDate);

  const avgDealSize: DriverMetric = {
    current: roundToDecimal(currentAvgDeal, 0),
    benchmark: roundToDecimal(historicalAvgDeal, 0),
    percentOfBenchmark: historicalAvgDeal > 0
      ? roundToDecimal((currentAvgDeal / historicalAvgDeal) * 100)
      : 100,
    previousValue: roundToDecimal(previousAvgDeal, 0),
    change: roundToDecimal(calculatePercentChange(currentAvgDeal, previousAvgDeal)),
    changeType: 'percent',
    isPositiveGood: true,
    tooltip: TOOLTIPS.avgDealSize,
  };

  // Sales Cycle
  const currentCycle = getSalesCycle(quarterInfo);
  const previousCycle = getSalesCycle(comparisonQuarter);

  const salesCycle: DriverMetric = {
    current: currentCycle,
    benchmark: SALES_CYCLE_BENCHMARK,
    percentOfBenchmark: SALES_CYCLE_BENCHMARK > 0
      ? roundToDecimal((currentCycle / SALES_CYCLE_BENCHMARK) * 100)
      : 100,
    previousValue: previousCycle,
    change: currentCycle - previousCycle, // Days change
    changeType: 'days',
    isPositiveGood: false, // Lower is better for sales cycle
    tooltip: TOOLTIPS.salesCycle,
  };

  return {
    quarter,
    comparisonPeriod: comparisonQuarter.quarter,
    pipelineValue,
    winRate,
    avgDealSize,
    salesCycle,
  };
}

// =============================================================================
// Risk Factors Service
// =============================================================================

export function calculateRiskFactors(quarter: string): RiskFactorsResponse {
  const quarterInfo = parseQuarter(quarter);

  // Stale Deals
  const staleDealsRaw = getStaleDeals(STALE_THRESHOLD_DAYS, REFERENCE_DATE);

  const staleBySegment: Map<string, { count: number; value: number }> = new Map();
  for (const deal of staleDealsRaw) {
    const existing = staleBySegment.get(deal.segment) || { count: 0, value: 0 };
    existing.count += 1;
    existing.value += deal.amount || 0;
    staleBySegment.set(deal.segment, existing);
  }

  const bySegment: SegmentSummary[] = Array.from(staleBySegment.entries())
    .map(([segment, data]) => ({
      segment,
      count: data.count,
      valueAtRisk: roundToDecimal(data.value, 0),
    }))
    .sort((a, b) => b.valueAtRisk - a.valueAtRisk);

  const staleDeals: StaleDeal[] = staleDealsRaw.slice(0, 10).map(d => ({
    dealId: d.deal_id,
    accountName: d.account_name,
    accountId: d.account_id,
    segment: d.segment,
    amount: d.amount,
    daysSinceActivity: d.days_since_activity,
    lastActivityDate: d.last_activity,
    stage: d.stage,
  }));

  // Underperforming Reps
  const repData = getUnderperformingReps(quarterInfo, MIN_DEALS_FOR_REP_ANALYSIS);

  const underperformingReps: UnderperformingRep[] = repData.reps.map(r => ({
    repId: r.rep_id,
    name: r.name,
    winRate: roundToDecimal(r.win_rate),
    teamAvgWinRate: roundToDecimal(repData.teamAvgWinRate),
    gapFromAverage: roundToDecimal(repData.teamAvgWinRate - r.win_rate),
    wonDeals: r.won,
    lostDeals: r.lost,
    totalDeals: r.won + r.lost,
  }));

  // Low Activity Accounts
  const lowActivityRaw = getLowActivityAccounts(LOW_ACTIVITY_THRESHOLD_DAYS, REFERENCE_DATE);

  const lowActivityAccounts: LowActivityAccount[] = lowActivityRaw.slice(0, 10).map(a => ({
    accountId: a.account_id,
    name: a.name,
    segment: a.segment,
    pipelineValue: roundToDecimal(a.pipeline_value, 0),
    openDealCount: a.open_deal_count,
    daysSinceActivity: a.days_since_activity,
    lastActivityDate: a.last_activity,
  }));

  return {
    quarter,
    staleDeals: {
      totalCount: staleDealsRaw.length,
      totalValueAtRisk: roundToDecimal(
        staleDealsRaw.reduce((sum, d) => sum + (d.amount || 0), 0),
        0
      ),
      thresholdDays: STALE_THRESHOLD_DAYS,
      bySegment,
      deals: staleDeals,
    },
    underperformingReps: {
      teamAvgWinRate: roundToDecimal(repData.teamAvgWinRate),
      count: underperformingReps.length,
      reps: underperformingReps,
    },
    lowActivityAccounts: {
      totalCount: lowActivityRaw.length,
      totalValueAtRisk: roundToDecimal(
        lowActivityRaw.reduce((sum, a) => sum + a.pipeline_value, 0),
        0
      ),
      thresholdDays: LOW_ACTIVITY_THRESHOLD_DAYS,
      accounts: lowActivityAccounts,
    },
  };
}

// =============================================================================
// Recommendations Service
// =============================================================================

export function generateRecommendations(quarter: string, compareWith?: string): RecommendationsResponse {
  const riskFactors = calculateRiskFactors(quarter);
  const drivers = calculateDrivers(quarter, compareWith);

  const recommendations: Recommendation[] = [];
  let idCounter = 1;

  // Rule 1: Stale deals by segment
  for (const segment of riskFactors.staleDeals.bySegment) {
    if (segment.count >= 5) {
      const priority = segment.segment === 'Enterprise' ? 'high' : 'medium';
      recommendations.push({
        id: `R${idCounter++}`,
        priority,
        title: `Focus on aging ${segment.segment} deals`,
        description: `${segment.count} deals in ${segment.segment} segment have been stale for ${riskFactors.staleDeals.thresholdDays}+ days.`,
        impact: `$${segment.valueAtRisk.toLocaleString()} pipeline at risk`,
        category: 'pipeline',
        relatedEntities: {
          type: 'segment',
          ids: [segment.segment],
          names: [segment.segment],
        },
      });
    }
  }

  // Rule 2: Underperforming reps (top 2)
  for (const rep of riskFactors.underperformingReps.reps.slice(0, 2)) {
    if (rep.gapFromAverage >= 10) {
      recommendations.push({
        id: `R${idCounter++}`,
        priority: 'high',
        title: `Coach ${rep.name} on closing techniques`,
        description: `Win rate ${rep.winRate}% is ${rep.gapFromAverage.toFixed(1)}% below team average of ${rep.teamAvgWinRate}%.`,
        impact: `Potential to improve ${rep.totalDeals} deals/quarter`,
        category: 'coaching',
        relatedEntities: {
          type: 'rep',
          ids: [rep.repId],
          names: [rep.name],
        },
      });
    }
  }

  // Rule 3: High-value low activity accounts
  const highValueAccounts = riskFactors.lowActivityAccounts.accounts.filter(
    a => a.pipelineValue >= 50000
  );
  if (highValueAccounts.length > 0) {
    const topAccounts = highValueAccounts.slice(0, 3);
    const totalValue = topAccounts.reduce((sum, a) => sum + a.pipelineValue, 0);
    recommendations.push({
      id: `R${idCounter++}`,
      priority: 'medium',
      title: `Re-engage high-value accounts`,
      description: `${topAccounts.map(a => a.name).join(', ')} have open deals but no recent activity.`,
      impact: `$${totalValue.toLocaleString()} pipeline at risk`,
      category: 'engagement',
      relatedEntities: {
        type: 'account',
        ids: topAccounts.map(a => a.accountId),
        names: topAccounts.map(a => a.name),
      },
    });
  }

  // Rule 4: Win rate declining
  if (drivers.winRate.change < -5) {
    recommendations.push({
      id: `R${idCounter++}`,
      priority: 'high',
      title: 'Investigate win rate decline',
      description: `Win rate dropped ${Math.abs(drivers.winRate.change).toFixed(1)}% from ${drivers.comparisonPeriod}.`,
      impact: 'Conversion rate improvement needed',
      category: 'analysis',
    });
  }

  // Rule 5: Sales cycle increasing
  if (drivers.salesCycle.change > 7) {
    recommendations.push({
      id: `R${idCounter++}`,
      priority: 'medium',
      title: 'Review deal progression bottlenecks',
      description: `Sales cycle increased by ${drivers.salesCycle.change} days from ${drivers.comparisonPeriod}.`,
      impact: 'Longer cycles delay revenue recognition',
      category: 'process',
    });
  }

  // Rule 6: Pipeline coverage low
  if (drivers.pipelineValue.percentOfBenchmark < 66) {
    recommendations.push({
      id: `R${idCounter++}`,
      priority: 'high',
      title: 'Increase pipeline generation',
      description: `Pipeline is only ${drivers.pipelineValue.percentOfBenchmark.toFixed(0)}% of recommended 3× coverage.`,
      impact: 'Risk of missing quarterly target',
      category: 'pipeline',
    });
  }

  // Rule 7: Segment win rate disparity
  const quarterInfo = parseQuarter(quarter);
  const segmentRates = getSegmentWinRates(quarterInfo);
  if (segmentRates.length >= 2) {
    const sorted = segmentRates.sort((a, b) => b.win_rate - a.win_rate);
    const highest = sorted[0];
    const lowest = sorted[sorted.length - 1];
    if (highest.win_rate - lowest.win_rate > 10 && lowest.won + lowest.lost >= 5) {
      recommendations.push({
        id: `R${idCounter++}`,
        priority: 'low',
        title: `Review ${lowest.segment} deal qualification`,
        description: `${lowest.segment} win rate (${lowest.win_rate.toFixed(1)}%) is significantly lower than ${highest.segment} (${highest.win_rate.toFixed(1)}%).`,
        impact: 'Process optimization opportunity',
        category: 'process',
        relatedEntities: {
          type: 'segment',
          ids: [lowest.segment],
          names: [lowest.segment],
        },
      });
    }
  }

  // Sort by priority and limit to 5
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return {
    quarter,
    recommendations: recommendations.slice(0, 5),
    generatedAt: new Date().toISOString(),
  };
}
