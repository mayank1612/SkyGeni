# THINKING.md - Revenue Intelligence Console

## 1. Assumptions Made

### Date & Time
- **Reference Date**: Used January 15, 2026 as the "current date" for calculations since the data spans 2025
- **Fiscal Year**: Assumed calendar year (Jan-Dec) alignment with standard quarters
- **Default Quarter**: Q1 2026 selected by default as the most recent quarter

### Business Logic
- **Revenue Recognition**: Revenue counted when deal reaches "Closed Won" status, attributed to the close date quarter
- **Pipeline Definition**: Sum of deal amounts for stages NOT in (Closed Won, Closed Lost)
- **Win Rate Formula**: `Won / (Won + Lost) * 100` - only includes fully closed deals
- **Sales Cycle**: Days from `created_at` to `closed_at` for won deals only

### Thresholds (Configurable in code)
- **Stale Deals**: 30+ days without any activity (call, email, demo)
- **Low Activity Accounts**: 14+ days without contact on accounts with open pipeline
- **Underperforming Reps**: Win rate below team average, minimum 3 closed deals for statistical significance

### Benchmarks
- **Pipeline Coverage**: 3x quarterly target (industry standard)
- **Win Rate**: 25% benchmark (B2B SaaS average is 20-30%)
- **Sales Cycle**: 45 days (weighted average for mixed SMB/Mid-Market)

## 2. Data Issues Found

### Issue 1: Missing `closed_at` on "Closed Won" Deals
```json
{
  "deal_id": "D1",
  "stage": "Closed Won",
  "amount": 60519,
  "created_at": "2025-04-08",
  "closed_at": null  // ← Problem
}
```
**Solution**: Used `COALESCE(closed_at, created_at)` - fallback to creation date when close date is missing. This ensures revenue is counted, though timing accuracy may be slightly off.

### Issue 2: Null Amounts
```json
{
  "deal_id": "D4",
  "amount": null,
  "stage": "Prospecting"
}
```
**Solution**:
- Excluded from monetary calculations (SUM, AVG)
- Included in count-based metrics (win rate counts)
- Displayed as "N/A" in UI where applicable

### Issue 3: Missing Q1 2026 Targets
The targets.json only contains data through December 2025. Q1 2026 has no target data.

**Solution**:
- API returns `target: 0` and `gapPercent: 0` when no target exists
- UI shows "No target set" instead of misleading numbers
- Recommendation engine still works based on other metrics

### Issue 4: Potential Orphan References
Some deals may reference non-existent accounts or reps.

**Solution**: Used LEFT JOINs and displayed "Unknown Account" / "Unknown Rep" for missing references.

## 3. Tradeoffs Chosen

### Database: In-Memory SQLite (sql.js) vs PostgreSQL

**Chose In-Memory Because:**
1. **Zero setup friction** - Reviewers can `npm install && npm start` without database configuration
2. **Fast cold start** - No connection pool initialization, no network latency
3. **Portable** - Works identically on Windows, Mac, Linux without any external dependencies
4. **Read-only use case** - We're analyzing static JSON data, not persisting writes
5. **Time constraint** - 3-4 hour assignment, wanted to focus on business logic and UI

**Trade-off Acknowledged:**
- PostgreSQL would be better for production (persistence, concurrent access, better date functions)
- Would use PostgreSQL + Prisma ORM for a real production system

### ORM: Raw SQL vs Prisma

**Chose Raw SQL Because:**
1. Simple queries (mostly aggregations) - no complex joins or nested relations
2. Only ~15 queries total across 4 endpoints
3. Prisma setup overhead (schema, generate, migrate) adds 15-20 minutes
4. sql.js doesn't have official Prisma adapter
5. Raw SQL is more transparent for code review

### Charts: D3 + React Hybrid

**Approach:**
- D3 for calculations (scales, layouts, data transformations)
- React for DOM rendering (SVG elements)
- D3 for interactions (tooltips, hover effects)

**Why this pattern:**
- Avoids D3/React DOM conflicts
- Maintains React's declarative model where possible
- Uses D3's powerful data visualization math

### UI: Material UI Only (No Custom CSS)

**Decision:** Used MUI's `sx` prop and theme for all styling - no separate CSS files.

**Benefits:**
- Consistent design language
- Responsive by default
- Faster development
- Easy dark mode support (if needed later)

## 4. What Would Break at 10× Scale?

### Current Data: ~600 deals, 250 activities, 120 accounts

### At 6,000 deals / 2,500 activities:

1. **In-Memory Database**
   - Memory usage would increase significantly (~50-100MB)
   - Cold start would slow to 1-2 seconds
   - **Fix**: Switch to PostgreSQL with connection pooling

2. **Full Table Scans**
   - Queries like "stale deals" scan entire deals + activities tables
   - **Fix**: Add proper indexes, partition by date, use materialized views for aggregations

3. **Single API Calls**
   - Dashboard loads 4 endpoints in parallel, each doing multiple queries
   - **Fix**: Implement caching (Redis), aggregate APIs, or GraphQL with batching

4. **No Pagination**
   - Risk factors return all stale deals, all underperforming reps
   - **Fix**: Add pagination, return top N with "view all" link

5. **Recommendations Recalculated**
   - Generated fresh on every request
   - **Fix**: Cache recommendations, invalidate on data change

### At 60,000 deals / 25,000 activities:

1. **Date Filtering**
   - `COALESCE(closed_at, created_at)` prevents index usage
   - **Fix**: Add computed/generated column for effective_date with index

2. **Real-time Requirements**
   - Static JSON doesn't support real data updates
   - **Fix**: Event-driven architecture, streaming updates

3. **Multi-tenant**
   - Current design assumes single organization
   - **Fix**: Add tenant_id to all tables, row-level security

## 5. What AI Helped With vs What I Decided

### AI Assisted (Claude/Copilot):
- Boilerplate code generation (Express routes, React components)
- SQL query syntax (especially date functions across SQLite/Postgres)
- D3.js chart setup (scales, axes, paths)
- Material UI component props and styling patterns
- TypeScript type definitions for API responses

### I Decided:
- **Architecture**: In-memory SQLite vs PostgreSQL decision based on assignment constraints
- **Data Model**: How to handle null closed_at dates, null amounts
- **Business Logic**: What constitutes "stale" (30 days), "underperforming" (below average)
- **Benchmarks**: 3x pipeline, 25% win rate, 45-day cycle - industry research
- **Recommendation Rules**: Which patterns to detect, priority ordering
- **UI Layout**: Widget arrangement, what information to show in tooltips
- **Trade-offs**: What to build vs what to skip given time constraints

### Key Design Decisions Made Without AI:
1. Using gauge bars with benchmark comparisons (not just raw numbers)
2. Showing "below average by X%" for reps (relative, not absolute)
3. Including trend data in summary endpoint (reduces API calls)
4. Expandable sections in Risk Factors (keeps UI clean)
5. Color coding based on performance against benchmarks

---

## Summary

This project demonstrates a balance between production-quality thinking and practical delivery within time constraints. The in-memory approach was a conscious trade-off for reviewer convenience, with clear documentation of what a production system would require.

The most challenging aspect was handling data inconsistencies gracefully while maintaining accurate calculations. The `COALESCE` pattern for missing dates became the key solution applied throughout.

If I had more time, I would add:
1. Unit tests for calculation functions
2. API response caching
3. More granular drill-down views
4. Export to CSV/PDF functionality
5. Dark mode support
