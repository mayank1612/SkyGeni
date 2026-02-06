# Widget Documentation

This document provides detailed specifications for each UI widget, including data calculations, visual design, and tooltip content.

---

## Overview

The Revenue Intelligence Console consists of 5 main widgets:

1. **KPI Summary Bar** - High-level revenue metrics
2. **Revenue Drivers Card** - Key performance indicators with benchmarks
3. **Risk Factors Card** - Issues requiring attention
4. **Recommendations Card** - Actionable next steps
5. **Revenue Trend Chart** - Historical performance visualization

---

## Widget 1: KPI Summary Bar

### Purpose
Provide at-a-glance view of quarterly revenue performance against targets.

### Visual Layout
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [Quarter Selector ▼]     [Compare with: Previous Quarter ▼]                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   QTD Revenue          Target              Gap                QoQ Change   │
│   $1,420,000          $2,000,000          -29.0%              +12.5%       │
│   ℹ️                    ℹ️                  ℹ️                  ℹ️            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Calculations

#### QTD Revenue
```sql
SELECT COALESCE(SUM(amount), 0) as revenue
FROM deals
WHERE stage = 'Closed Won'
  AND amount IS NOT NULL
  AND COALESCE(closed_at, created_at) >= :quarter_start
  AND COALESCE(closed_at, created_at) < :quarter_end;
```

**Tooltip:** "Total revenue from deals closed as Won in the selected quarter. Deals with missing close dates use their creation date."

#### Target
```sql
SELECT SUM(target) as quarter_target
FROM targets
WHERE month >= :quarter_start_month
  AND month <= :quarter_end_month;
```

**Tooltip:** "Sum of monthly revenue targets for the selected quarter."

#### Gap Percentage
```typescript
const gapPercent = ((revenue - target) / target) * 100;
```

**Tooltip:** "Percentage difference between actual revenue and target. Negative means below target."

**Color Coding:**
- Green: gap >= 0 (at or above target)
- Orange: gap between -15% and 0
- Red: gap < -15%

#### QoQ Change
```typescript
const qoqChange = ((currentRevenue - previousRevenue) / previousRevenue) * 100;
```

**Tooltip:** "Revenue change compared to {comparison period}. Positive indicates growth."

**Color Coding:**
- Green: change > 0
- Red: change < 0
- Gray: change = 0

### API Endpoint
`GET /api/summary?quarter=Q1 2026&compareWith=Q4 2025`

### Response Schema
```typescript
interface SummaryResponse {
  quarter: string;              // "Q1 2026"
  revenue: number;              // 1420000
  target: number;               // 2000000
  gapPercent: number;           // -29.0
  gapAmount: number;            // -580000
  previousRevenue: number;      // 1262222
  changePercent: number;        // 12.5
  comparisonPeriod: string;     // "Q4 2025"
}
```

---

## Widget 2: Revenue Drivers Card

### Purpose
Show key metrics that drive revenue performance with comparison to benchmarks and previous period.

### Visual Layout
```
┌────────────────────────────────────────────────────────────┐
│  Revenue Drivers                                      ℹ️   │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Pipeline Value                                   $4.8M   │
│  [████████████████░░░░░░░░░░░░░░░░░░░░░]          80%    │
│  Benchmark: $6M (3× target)              ↑ 14.3% vs prev  │
│                                                      ℹ️    │
│  ──────────────────────────────────────────────────────── │
│                                                            │
│  Win Rate                                           18%   │
│  [██████████░░░░░░░░░░░░░░░░░░░░░░░░░░░]          72%    │
│  Benchmark: 25%                          ↓ 4.0% vs prev   │
│                                                      ℹ️    │
│  ──────────────────────────────────────────────────────── │
│                                                            │
│  Avg Deal Size                                   $21.3K   │
│  [████████████████████░░░░░░░░░░░░░░░░░]         106%    │
│  Benchmark: $20K (historical avg)        ↑ 8.2% vs prev   │
│                                                      ℹ️    │
│  ──────────────────────────────────────────────────────── │
│                                                            │
│  Sales Cycle                                     45 days  │
│  [██████████████░░░░░░░░░░░░░░░░░░░░░░░]         100%    │
│  Benchmark: 45 days                      ↓ 3 days vs prev │
│                                                      ℹ️    │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Data Calculations

#### Pipeline Value

**Definition:** Total value of all open (non-closed) deals.

```sql
SELECT COALESCE(SUM(amount), 0) as pipeline_value
FROM deals
WHERE stage NOT IN ('Closed Won', 'Closed Lost')
  AND amount IS NOT NULL;
```

**Benchmark Calculation:**
```typescript
const pipelineBenchmark = quarterTarget * 3; // 3× coverage ratio
const pipelinePercent = (pipelineValue / pipelineBenchmark) * 100;
```

**Tooltip:** "Total value of deals currently in progress (not yet won or lost). Healthy pipeline should be 3× your quarterly target for adequate coverage."

**Gauge Interpretation:**
- 100% = Pipeline equals 3× target (healthy)
- >100% = Strong pipeline coverage
- <100% = Pipeline may be insufficient to hit target

---

#### Win Rate

**Definition:** Percentage of closed deals that were won.

```sql
SELECT
  COUNT(CASE WHEN stage = 'Closed Won' THEN 1 END) as won,
  COUNT(CASE WHEN stage = 'Closed Lost' THEN 1 END) as lost
FROM deals
WHERE stage IN ('Closed Won', 'Closed Lost')
  AND COALESCE(closed_at, created_at) >= :quarter_start
  AND COALESCE(closed_at, created_at) < :quarter_end;
```

```typescript
const winRate = (won / (won + lost)) * 100;
```

**Benchmark:** 25% (B2B SaaS industry average)

**Tooltip:** "Percentage of closed deals that were won. Calculated as: Won Deals ÷ (Won + Lost Deals). Industry benchmark is 25%. Deals still in progress are not included."

**Gauge Interpretation:**
- 100% = Win rate equals benchmark (25%)
- >100% = Above benchmark performance
- <100% = Below benchmark, may need sales coaching

---

#### Average Deal Size

**Definition:** Mean value of closed-won deals.

```sql
SELECT AVG(amount) as avg_deal_size
FROM deals
WHERE stage = 'Closed Won'
  AND amount IS NOT NULL
  AND COALESCE(closed_at, created_at) >= :quarter_start
  AND COALESCE(closed_at, created_at) < :quarter_end;
```

**Benchmark:** Historical average from previous 4 quarters

```sql
SELECT AVG(amount) as historical_avg
FROM deals
WHERE stage = 'Closed Won'
  AND amount IS NOT NULL
  AND COALESCE(closed_at, created_at) >= :four_quarters_ago
  AND COALESCE(closed_at, created_at) < :quarter_start;
```

**Tooltip:** "Average revenue per closed-won deal this quarter. Compared against your historical average from the past 4 quarters. Higher values indicate moving upmarket or better negotiation."

**Gauge Interpretation:**
- 100% = Same as historical average
- >100% = Deals are larger than usual (positive if intentional)
- <100% = Deals are smaller than usual

---

#### Sales Cycle

**Definition:** Average days from deal creation to close (for won deals).

```sql
SELECT AVG(
  JULIANDAY(closed_at) - JULIANDAY(created_at)
) as avg_sales_cycle
FROM deals
WHERE stage = 'Closed Won'
  AND closed_at IS NOT NULL
  AND created_at IS NOT NULL
  AND COALESCE(closed_at, created_at) >= :quarter_start
  AND COALESCE(closed_at, created_at) < :quarter_end;
```

**Benchmark:** 45 days (weighted average: SMB 30d, Mid-Market 45d, Enterprise 75d)

**Tooltip:** "Average number of days from deal creation to close for won deals. Shorter cycles indicate efficient sales process. Benchmark is 45 days for mixed SMB/Mid-Market portfolio."

**Gauge Interpretation (INVERTED - lower is better):**
- 100% = At benchmark (45 days)
- <100% = Faster than benchmark (good)
- >100% = Slower than benchmark (may need process improvement)

**Color Coding (inverted):**
- Green: ≤100% of benchmark
- Orange: 100-120% of benchmark
- Red: >120% of benchmark

---

### API Endpoint
`GET /api/drivers?quarter=Q1 2026&compareWith=Q4 2025`

### Response Schema
```typescript
interface DriversResponse {
  pipelineValue: {
    current: number;           // 4800000
    benchmark: number;         // 6000000
    percentOfBenchmark: number; // 80
    previousValue: number;     // 4200000
    changePercent: number;     // 14.3
    tooltip: string;
  };
  winRate: {
    current: number;           // 18
    benchmark: number;         // 25
    percentOfBenchmark: number; // 72
    previousValue: number;     // 22
    changeAbsolute: number;    // -4 (absolute change for rates)
    tooltip: string;
  };
  avgDealSize: {
    current: number;           // 21300
    benchmark: number;         // 20000
    percentOfBenchmark: number; // 106.5
    previousValue: number;     // 19680
    changePercent: number;     // 8.2
    tooltip: string;
  };
  salesCycle: {
    current: number;           // 45
    benchmark: number;         // 45
    percentOfBenchmark: number; // 100
    previousValue: number;     // 48
    changeDays: number;        // -3 (negative = faster = good)
    tooltip: string;
  };
}
```

---

## Widget 3: Risk Factors Card

### Purpose
Highlight issues that need immediate attention to protect revenue.

### Visual Layout
```
┌────────────────────────────────────────────────────────────┐
│  Top Risk Factors                                     ℹ️   │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ⚠️ Stale Deals                                           │
│  23 deals with no activity in 30+ days                    │
│  │ Enterprise: 8 deals ($890K at risk)                    │
│  │ Mid-Market: 10 deals ($420K at risk)                   │
│  │ SMB: 5 deals ($95K at risk)                            │
│  [View Details →]                                    ℹ️    │
│                                                            │
│  ──────────────────────────────────────────────────────── │
│                                                            │
│  ⚠️ Underperforming Reps                                  │
│  2 reps with win rate below team average                  │
│  │ Ankit: 8% win rate (14% below team avg of 22%)        │
│  │ Priya: 12% win rate (10% below team avg)              │
│  [View Details →]                                    ℹ️    │
│                                                            │
│  ──────────────────────────────────────────────────────── │
│                                                            │
│  ⚠️ Low Activity Accounts                                 │
│  17 accounts with open deals but no recent activity       │
│  │ Company_12: $125K pipeline, 21 days since contact     │
│  │ Company_45: $89K pipeline, 18 days since contact      │
│  │ +15 more accounts                                      │
│  [View Details →]                                    ℹ️    │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Data Calculations

#### Stale Deals

**Definition:** Open deals with no activity in the last 30 days.

```sql
-- Get last activity date for each open deal
SELECT
  d.deal_id,
  d.amount,
  a.segment,
  a.name as account_name,
  d.created_at,
  MAX(act.timestamp) as last_activity,
  JULIANDAY(:current_date) - JULIANDAY(
    COALESCE(MAX(act.timestamp), d.created_at)
  ) as days_since_activity
FROM deals d
LEFT JOIN activities act ON d.deal_id = act.deal_id
LEFT JOIN accounts a ON d.account_id = a.account_id
WHERE d.stage NOT IN ('Closed Won', 'Closed Lost')
GROUP BY d.deal_id
HAVING days_since_activity > 30
ORDER BY d.amount DESC NULLS LAST;
```

**Aggregation by Segment:**
```sql
SELECT
  a.segment,
  COUNT(*) as deal_count,
  COALESCE(SUM(d.amount), 0) as value_at_risk
FROM (/* stale deals subquery */) as stale
JOIN accounts a ON stale.account_id = a.account_id
GROUP BY a.segment
ORDER BY value_at_risk DESC;
```

**Tooltip (Card Header):** "Deals are considered stale when there has been no activity (calls, emails, demos) for 30 or more days. Stale deals are at higher risk of being lost."

**Tooltip (Per Segment):** "X deals in {Segment} segment have had no activity for 30+ days, representing $Y in potential revenue at risk."

---

#### Underperforming Reps

**Definition:** Reps with win rate below team average (minimum 3 closed deals).

```sql
-- Step 1: Calculate team average
SELECT
  COUNT(CASE WHEN stage = 'Closed Won' THEN 1 END) * 100.0 /
  NULLIF(COUNT(CASE WHEN stage IN ('Closed Won', 'Closed Lost') THEN 1 END), 0)
  as team_avg_win_rate
FROM deals
WHERE stage IN ('Closed Won', 'Closed Lost')
  AND COALESCE(closed_at, created_at) >= :quarter_start
  AND COALESCE(closed_at, created_at) < :quarter_end;

-- Step 2: Get reps below average
SELECT
  r.rep_id,
  r.name,
  COUNT(CASE WHEN d.stage = 'Closed Won' THEN 1 END) as won,
  COUNT(CASE WHEN d.stage = 'Closed Lost' THEN 1 END) as lost,
  COUNT(CASE WHEN d.stage = 'Closed Won' THEN 1 END) * 100.0 /
    NULLIF(COUNT(CASE WHEN d.stage IN ('Closed Won', 'Closed Lost') THEN 1 END), 0)
    as win_rate,
  :team_avg_win_rate - (above win_rate calculation) as gap_from_average
FROM reps r
JOIN deals d ON r.rep_id = d.rep_id
WHERE d.stage IN ('Closed Won', 'Closed Lost')
  AND COALESCE(d.closed_at, d.created_at) >= :quarter_start
  AND COALESCE(d.closed_at, d.created_at) < :quarter_end
GROUP BY r.rep_id, r.name
HAVING (won + lost) >= 3  -- Minimum deals threshold
  AND win_rate < :team_avg_win_rate
ORDER BY gap_from_average DESC;
```

**Tooltip (Card Header):** "Reps whose win rate is below the team average for this quarter. Only includes reps with at least 3 closed deals to ensure statistical significance."

**Tooltip (Per Rep):** "{Rep Name} has closed {Won} of {Total} deals ({WinRate}%), which is {Gap}% below the team average of {TeamAvg}%."

---

#### Low Activity Accounts

**Definition:** Accounts with open pipeline but no activity in 14+ days.

```sql
SELECT
  a.account_id,
  a.name,
  a.segment,
  COUNT(d.deal_id) as open_deal_count,
  COALESCE(SUM(d.amount), 0) as pipeline_value,
  MAX(act.timestamp) as last_activity,
  JULIANDAY(:current_date) - JULIANDAY(
    COALESCE(MAX(act.timestamp), MIN(d.created_at))
  ) as days_since_activity
FROM accounts a
JOIN deals d ON a.account_id = d.account_id
LEFT JOIN activities act ON d.deal_id = act.deal_id
WHERE d.stage NOT IN ('Closed Won', 'Closed Lost')
GROUP BY a.account_id
HAVING days_since_activity > 14
ORDER BY pipeline_value DESC;
```

**Tooltip (Card Header):** "Accounts that have open deals in the pipeline but haven't been contacted in 14 or more days. Regular engagement is critical to move deals forward."

**Tooltip (Per Account):** "{Account Name} has {DealCount} open deals worth ${Value} but hasn't been contacted in {Days} days."

---

### API Endpoint
`GET /api/risk-factors?quarter=Q1 2026`

### Response Schema
```typescript
interface RiskFactorsResponse {
  staleDeals: {
    totalCount: number;
    totalValueAtRisk: number;
    thresholdDays: number;      // 30
    bySegment: Array<{
      segment: string;
      count: number;
      valueAtRisk: number;
    }>;
    topDeals: Array<{          // Top 5 by value
      dealId: string;
      accountName: string;
      amount: number;
      daysSinceActivity: number;
      lastActivityDate: string | null;
    }>;
  };

  underperformingReps: {
    teamAvgWinRate: number;
    count: number;
    reps: Array<{
      repId: string;
      name: string;
      winRate: number;
      gapFromAverage: number;   // How much below average
      wonDeals: number;
      lostDeals: number;
      totalDeals: number;
    }>;
  };

  lowActivityAccounts: {
    totalCount: number;
    totalValueAtRisk: number;
    thresholdDays: number;      // 14
    accounts: Array<{           // Top 10 by value
      accountId: string;
      name: string;
      segment: string;
      pipelineValue: number;
      openDealCount: number;
      daysSinceActivity: number;
      lastActivityDate: string | null;
    }>;
  };
}
```

---

## Widget 4: Recommendations Card

### Purpose
Provide actionable suggestions based on identified risks and performance gaps.

### Visual Layout
```
┌────────────────────────────────────────────────────────────┐
│  Recommended Actions                                  ℹ️   │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  1. 🔴 Focus on aging Enterprise deals                    │
│     8 deals worth $890K have been stale for 30+ days.     │
│     Priority: High | Impact: $890K pipeline               │
│                                                      ℹ️    │
│                                                            │
│  2. 🔴 Coach Ankit on closing techniques                  │
│     Win rate 8% is 14% below team average.                │
│     Priority: High | Impact: Win rate improvement         │
│                                                      ℹ️    │
│                                                            │
│  3. 🟡 Re-engage Company_12 and Company_45               │
│     $214K pipeline at risk due to inactivity.             │
│     Priority: Medium | Impact: $214K pipeline             │
│                                                      ℹ️    │
│                                                            │
│  4. 🟡 Investigate win rate decline                       │
│     Win rate dropped 4% from last quarter.                │
│     Priority: Medium | Impact: Conversion improvement     │
│                                                      ℹ️    │
│                                                            │
│  5. 🟢 Review SMB deal qualification                      │
│     SMB win rate (12%) is below Enterprise (24%).         │
│     Priority: Low | Impact: Process optimization          │
│                                                      ℹ️    │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Recommendation Generation Rules

| Rule ID | Trigger | Recommendation | Priority |
|---------|---------|----------------|----------|
| R1 | >5 stale deals in any segment | "Focus on aging {Segment} deals" | High if Enterprise, Medium otherwise |
| R2 | Rep win rate >10% below average | "Coach {Rep} on closing techniques" | High |
| R3 | High-value account inactive 14+ days | "Re-engage {Account}" | Medium if >$100K, Low otherwise |
| R4 | Win rate QoQ drop >5% | "Investigate win rate decline" | High |
| R5 | Sales cycle increased >7 days | "Review deal progression bottlenecks" | Medium |
| R6 | Pipeline <2× target | "Increase pipeline generation" | High |
| R7 | Segment win rate disparity >10% | "Review {lower segment} deal qualification" | Low |

### Priority Color Coding
- 🔴 High: Immediate revenue impact or significant performance gap
- 🟡 Medium: Important but not urgent
- 🟢 Low: Optimization opportunity

**Tooltip (Card Header):** "AI-generated recommendations based on your current performance data and identified risk factors. Prioritized by potential revenue impact."

**Tooltip (Per Recommendation):** Specific context based on the rule triggered.

---

### API Endpoint
`GET /api/recommendations?quarter=Q1 2026`

### Response Schema
```typescript
interface RecommendationsResponse {
  recommendations: Array<{
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
  }>;
  generatedAt: string;         // ISO timestamp
  basedOnQuarter: string;      // "Q1 2026"
}
```

---

## Widget 5: Revenue Trend Chart

### Purpose
Visualize revenue performance over time compared to targets.

### Visual Layout
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Revenue Trend (Last 6 Months)                                         ℹ️   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   $300K ─┤                                              ╭────── Target      │
│          │                                         ╭───╯                    │
│   $250K ─┤                              ╭─────────╯                         │
│          │         ╭────╮         ╭────╯                                    │
│   $200K ─┤    ╭───╯    ╰───╮ ╭───╯         ████ Actual Revenue             │
│          │───╯             ╰─╯             ──── Target                      │
│   $150K ─┤                                                                  │
│          │                                                                  │
│   $100K ─┤                                                                  │
│          │                                                                  │
│       0 ─┼────┬────┬────┬────┬────┬────┬                                    │
│          Aug  Sep  Oct  Nov  Dec  Jan                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Chart Specifications

**Chart Type:** Combination chart
- Area chart (filled) for actual revenue
- Line chart (dashed) for target
- Optional: Bar chart overlay for monthly comparison

**D3 Implementation:**
- X-axis: Time scale (months)
- Y-axis: Linear scale (currency)
- Area: `d3.area()` with curve interpolation
- Line: `d3.line()` for target

### Data Query
```sql
SELECT
  t.month,
  t.target,
  COALESCE(SUM(d.amount), 0) as actual
FROM targets t
LEFT JOIN deals d ON
  strftime('%Y-%m', COALESCE(d.closed_at, d.created_at)) = t.month
  AND d.stage = 'Closed Won'
  AND d.amount IS NOT NULL
WHERE t.month >= :six_months_ago
GROUP BY t.month
ORDER BY t.month;
```

**Tooltip (Chart Header):** "Monthly revenue trend showing actual closed revenue versus targets. The shaded area represents actual revenue, the dashed line represents targets."

**Tooltip (On Hover - Data Point):**
```
{Month} {Year}
Actual: ${actual}
Target: ${target}
Gap: {gapPercent}%
```

---

### API Endpoint
Included in `/api/summary` or separate `GET /api/trend?months=6`

### Response Schema
```typescript
interface TrendDataPoint {
  month: string;          // "2025-08"
  monthLabel: string;     // "Aug"
  year: number;           // 2025
  actual: number;         // 185000
  target: number;         // 200000
  gapPercent: number;     // -7.5
  cumulativeActual: number;   // For QTD running total
  cumulativeTarget: number;
}

interface TrendResponse {
  data: TrendDataPoint[];
  period: {
    start: string;
    end: string;
    months: number;
  };
}
```

---

## Tooltip Content Reference

### Quick Reference Table

| Widget | Element | Tooltip Text |
|--------|---------|--------------|
| KPI Bar | QTD Revenue | "Total revenue from deals closed as Won in the selected quarter. Deals with missing close dates use their creation date." |
| KPI Bar | Target | "Sum of monthly revenue targets for the selected quarter." |
| KPI Bar | Gap % | "Percentage difference between actual revenue and target. Negative means below target." |
| KPI Bar | QoQ Change | "Revenue change compared to {comparison period}. Positive indicates growth." |
| Drivers | Pipeline Value | "Total value of deals currently in progress (not yet won or lost). Healthy pipeline should be 3× your quarterly target for adequate coverage." |
| Drivers | Win Rate | "Percentage of closed deals that were won. Calculated as: Won Deals ÷ (Won + Lost Deals). Industry benchmark is 25%." |
| Drivers | Avg Deal Size | "Average revenue per closed-won deal this quarter. Compared against your historical average from the past 4 quarters." |
| Drivers | Sales Cycle | "Average number of days from deal creation to close for won deals. Shorter cycles indicate efficient sales process. Benchmark is 45 days." |
| Drivers | Gauge Bar | "Progress toward benchmark. 100% means you've reached the healthy target level." |
| Risk | Stale Deals | "Deals are considered stale when there has been no activity (calls, emails, demos) for 30 or more days." |
| Risk | Underperforming Reps | "Reps whose win rate is below the team average for this quarter. Only includes reps with at least 3 closed deals." |
| Risk | Low Activity Accounts | "Accounts that have open deals in the pipeline but haven't been contacted in 14 or more days." |
| Recommendations | Header | "AI-generated recommendations based on your current performance data and identified risk factors." |
| Trend Chart | Header | "Monthly revenue trend showing actual closed revenue versus targets." |

---

## Accessibility Notes

1. **Color Blindness:** All color-coded elements also have text/icon indicators
2. **Screen Readers:** All tooltips have corresponding `aria-label` attributes
3. **Keyboard Navigation:** All interactive elements are focusable
4. **Contrast:** All text meets WCAG AA contrast requirements

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-XX | Initial widget documentation |
