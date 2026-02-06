**Full Stack Engineer (React \+ TypeScript \+ Backend)**  
**Timebox:** 3–4 hours  
**Difficulty:** Real-world product problem  
**AI Usage:** Allowed (see below)

### **Provided Data**

You are given 5 JSON files representing 1 year of sales data:

- `accounts.json` – customer accounts
- `reps.json` – sales representatives
- `deals.json` – sales deals
- `activities.json` – calls/emails
- `targets.json` – monthly revenue targets

**Assume this data comes from multiple real systems and may contain inconsistencies**

## **Your Task**

Build a **single-page Revenue Intelligence Console**.

It should help a CRO answer:

“Why are we behind (or ahead) on revenue this quarter,  
 and what should we focus on right now?”

## **Functional Requirements**

### **Backend (TypeScript)**

#### **1\. Summary \- /api/summary**

- Current Quarter Revenue
- Target
- Gap (%)
- YoY or QoQ change

#### **2\. Revenue Drivers \- /api/drivers**

Explain performance using:

- Pipeline size
- Win rate
- Average deal size
- Sales cycle time

#### **3\. Risk Factors \- /api/risk-factors**

Identify:

- Stale deals
- Underperforming reps
- Low activity accounts

#### **4\. Recommendations \- /api/recommendations**

Return 3–5 **actionable suggestions**, e.g:

- “Focus on Enterprise deals older than 30 days”
- “Coach Rep A on win rate”
- “Increase activity for Segment B”

### **Frontend (React \+ TypeScript)**

![][image1]

## **Constraints**

- You may use any SQL database (SQLite / Postgres / MySQL / in-memory)
- You need to use Material UI and D3 charting only
- You may use AI tools (ChatGPT, Copilot, Cursor)

## **Critical Deliverable – Reflection**

Create a file:

`THINKING.md`

Answer:

1. What assumptions did you make?
2. What data issues did you find?
3. What tradeoffs did you choose?
4. What would break at 10× scale?
5. What did AI help with vs what you decided?

This document is **as important as your code**.

## **Submission**

Share a GitHub repo with:

`/backend`  
`/frontend`  
`/data`  
`THINKING.md`  
[`README.md`](http://README.md)

**`Also, API endpoints should be same as specified above.`**
