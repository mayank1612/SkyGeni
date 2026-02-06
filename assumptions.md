# Assumptions Document

This document captures all assumptions made during the development of the Revenue Intelligence Console.

---

## 1. Date & Time Assumptions

| Assumption | Value | Rationale |
|------------|-------|-----------|
| Current Date (for calculations) | 2026-01-15 | Mid Q1 2026, allows testing with partial quarter data |
| Default Selected Quarter | Q1 2026 | Most recent quarter for CRO to analyze |
| Fiscal Year | Calendar Year (Jan-Dec) | No fiscal year offset mentioned in requirements |
| Quarter Definition | Q1: Jan-Mar, Q2: Apr-Jun, Q3: Jul-Sep, Q4: Oct-Dec | Standard calendar quarters |

---

## 2. Data Inconsistency Handling

### 2.1 Deals with `closed_at: null` but `stage: "Closed Won"`

**Issue:** Some deals are marked as "Closed Won" but have no `closed_at` date.

**Solution:** Use `COALESCE(closed_at, created_at)` - fallback to `created_at` when `closed_at` is null.

**Rationale:** A won deal must have been closed at some point. Using creation date as fallback ensures revenue is counted, though timing may be slightly off.

**Example from data:**
```json
{
  "deal_id": "D1",
  "stage": "Closed Won",
  "amount": 60519,
  "created_at": "2025-04-08",
  "closed_at": null  // ← Issue
}
```

### 2.2 Deals with `amount: null`

**Issue:** Some deals have no amount specified.

**Solution:** Exclude from monetary calculations (SUM, AVG), include in count-based metrics (win rate).

**Rationale:** Including null amounts would skew averages. However, the deal still represents a win/loss for rate calculations.

**Example from data:**
```json
{
  "deal_id": "D4",
  "stage": "Prospecting",
  "amount": null,  // ← Issue
  "created_at": "2025-03-13"
}
```

### 2.3 Orphan References

**Issue:** Potential for `deal.account_id` or `deal.rep_id` to reference non-existent records.

**Solution:** Use LEFT JOIN and handle nulls gracefully. Display "Unknown Account" or "Unknown Rep" in UI.

### 2.4 Activities for Closed Deals

**Issue:** Activities may exist for already closed deals (data entry timing).

**Solution:** Include all activities in historical analysis, but only consider activities up to `closed_at` date for sales cycle analysis.

---

## 3. Business Logic Assumptions

### 3.1 Deal Stages

| Stage | Classification | Included in Pipeline? | Included in Win Rate? |
|-------|---------------|----------------------|----------------------|
| Prospecting | Open | Yes | No |
| Qualification | Open | Yes | No |
| Proposal | Open | Yes | No |
| Negotiation | Open | Yes | No |
| Closed Won | Closed | No | Yes (as Won) |
| Closed Lost | Closed | No | Yes (as Lost) |

### 3.2 Revenue Recognition

- Revenue is recognized when deal reaches "Closed Won" status
- Revenue is attributed to the quarter of `closed_at` date (or `created_at` if null)
- Only deals with non-null `amount` contribute to revenue totals

### 3.3 Pipeline Calculation

- Pipeline = Sum of `amount` for all open deals (not Closed Won/Lost)
- Deals with `amount: null` are excluded from pipeline value but counted in deal counts
- Pipeline coverage ratio benchmark: 3x quarterly target

### 3.4 Win Rate Calculation

```
Win Rate = (Closed Won Deals / Total Closed Deals) × 100
         = Won / (Won + Lost) × 100
```

- Deals with `amount: null` ARE included in win rate (they still won/lost)
- Only deals closed within selected quarter are counted

### 3.5 Sales Cycle Calculation

```
Sales Cycle = AVG(closed_at - created_at) for Closed Won deals
```

- Only includes deals where both dates are non-null
- Measured in calendar days
- Deals closed same day as created = 0 days (valid for quick wins)

---

## 4. Threshold Assumptions

### 4.1 Stale Deal Definition

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Days without activity | 30 days | Industry standard for B2B sales follow-up |
| Reference point | Last activity timestamp OR created_at if no activities | Deals with no activities are considered stale from creation |

**UI Display:** "Deals with no activity in the last 30 days"

### 4.2 Underperforming Rep Definition

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Comparison baseline | Team average win rate for the quarter | Relative performance matters more than absolute |
| Minimum deals threshold | 3 closed deals | Avoid flagging reps with insufficient data |
| Display logic | Show reps below team average, sorted by gap | Focus on largest improvement opportunities |

**UI Display:** "Win rate X% (Y% below team average)"

### 4.3 Low Activity Account Definition

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Days without activity | 14 days | Accounts need more frequent touch than individual deals |
| Must have open deals | Yes | Only flag accounts with active pipeline |
| Priority | Sorted by pipeline value at risk | Focus on high-value accounts first |

---

## 5. Benchmark Assumptions

These benchmarks are used for the gauge/progress bars in Revenue Drivers.

| Metric | Benchmark | Source | Interpretation |
|--------|-----------|--------|----------------|
| Pipeline Coverage | 3× quarterly target | Industry standard | Pipeline should be 3x target to hit goals |
| Win Rate | 25% | B2B SaaS average (20-30%) | Healthy conversion rate |
| Avg Deal Size | Calculated from data | Previous 4 quarters average | Context-specific |
| Sales Cycle | 45 days | SMB/Mid-market average | Varies by segment |

### Benchmark Calculation Logic:

```typescript
// Pipeline benchmark
pipelineBenchmark = quarterlyTarget * 3;

// Win rate benchmark (fixed)
winRateBenchmark = 25; // percent

// Avg deal size benchmark (dynamic)
avgDealSizeBenchmark = calculateHistoricalAverage(last4Quarters);

// Sales cycle benchmark (segment-weighted)
salesCycleBenchmark = {
  SMB: 30,
  'Mid-Market': 45,
  Enterprise: 75
};
```

---

## 6. UI/UX Assumptions

### 6.1 Quarter Selector

- Shows all quarters present in data (Q1-Q4 2025, Q1 2026)
- Default: Q1 2026
- Comparison: Previous quarter by default (Q4 2025 when Q1 2026 selected)

### 6.2 Comparison Period Options

| Option | Description |
|--------|-------------|
| Previous Quarter (default) | Q1 2026 vs Q4 2025 |
| Same Quarter Last Year | Q1 2026 vs Q1 2025 |
| Custom | User selects comparison quarter |

### 6.3 Color Coding

| Performance Level | Color | Condition |
|-------------------|-------|-----------|
| Good | Green (#4CAF50) | ≥80% of benchmark OR positive change |
| Warning | Orange (#FF9800) | 50-80% of benchmark |
| Critical | Red (#F44336) | <50% of benchmark OR negative change (for positive metrics) |

*Note: For Sales Cycle, lower is better, so colors are inverted.*

### 6.4 Number Formatting

| Type | Format | Example |
|------|--------|---------|
| Currency | $X.XM or $X.XK | $4.8M, $21.3K |
| Percentage | X.X% | 18.5% |
| Days | X days | 45 days |
| Change | +X.X% or -X.X% with arrow | ↑ 12.5% or ↓ 4.2% |

---

## 7. API Assumptions

### 7.1 Query Parameters

All endpoints accept:
- `quarter`: string (format: "Q1 2026") - defaults to current quarter
- `compareWith`: string (format: "Q4 2025") - defaults to previous quarter

### 7.2 Response Caching

- Data is recalculated on each request (no caching)
- Rationale: Data is read-only and in-memory, fast enough without caching

### 7.3 Error Handling

- Invalid quarter format: Return 400 with helpful message
- No data for quarter: Return empty results with zeros, not 404
- Database errors: Return 500 with generic message (no internal details)

---

## 8. Technical Assumptions

### 8.1 Database

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Database type | In-memory SQLite | Fast, no external dependencies, suitable for demo |
| Data loading | On server startup | JSON files loaded once, converted to SQL tables |
| Persistence | None (reloads from JSON) | Acceptable for read-only analytics |

### 8.2 Why Not PostgreSQL?

1. **Zero setup friction** - Reviewers can run locally without DB configuration
2. **No cold start** - No connection pool initialization delay
3. **Portable** - Works identically on any machine
4. **Read-only use case** - No need for ACID transactions or persistence
5. **Time constraint** - 3-4 hour assignment, optimize for delivery

### 8.3 Why Not Prisma?

1. **Overhead** - Schema definition + client generation adds 15-20 minutes
2. **Simple queries** - Our 10-15 queries are straightforward aggregations
3. **In-memory SQLite** - Prisma adds complexity for this setup
4. **Transparency** - Raw SQL is easier to review and understand

---

## 9. Recommendation Engine Assumptions

### 9.1 Rule-Based Logic

Recommendations are generated using predefined rules, not ML/AI.

| Rule | Trigger Condition | Recommendation |
|------|-------------------|----------------|
| Stale Enterprise deals | >5 Enterprise deals stale | "Focus on X aging deals in Enterprise segment" |
| Underperforming rep | Win rate <15% with >3 deals | "Coach [Rep] on closing - X% below average" |
| Low activity accounts | High-value account with no activity 14+ days | "Re-engage [Account] - $X pipeline at risk" |
| Win rate declining | QoQ drop >5% | "Analyze lost deals for patterns" |
| Sales cycle increasing | QoQ increase >7 days | "Review deal progression bottlenecks" |

### 9.2 Recommendation Priority

| Priority | Criteria |
|----------|----------|
| High | Revenue impact >$100K OR win rate issue |
| Medium | Revenue impact $25K-$100K OR process issue |
| Low | Optimization opportunity |

### 9.3 Maximum Recommendations

- Display: 3-5 recommendations
- Sorted by: Priority (High → Low), then by revenue impact

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-XX | Initial assumptions documented |
