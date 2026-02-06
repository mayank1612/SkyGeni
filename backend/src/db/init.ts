import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { Account, Rep, Deal, Activity, Target } from '../types';

let db: SqlJsDatabase;

export async function initializeDatabase(): Promise<void> {
  console.log('Initializing in-memory database...');

  // Initialize SQL.js
  const SQL = await initSqlJs();
  db = new SQL.Database();

  // Create tables
  db.run(`
    -- Accounts table
    CREATE TABLE IF NOT EXISTS accounts (
      account_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      industry TEXT,
      segment TEXT
    );

    -- Reps table
    CREATE TABLE IF NOT EXISTS reps (
      rep_id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );

    -- Deals table
    CREATE TABLE IF NOT EXISTS deals (
      deal_id TEXT PRIMARY KEY,
      account_id TEXT,
      rep_id TEXT,
      stage TEXT NOT NULL,
      amount REAL,
      created_at TEXT,
      closed_at TEXT
    );

    -- Activities table
    CREATE TABLE IF NOT EXISTS activities (
      activity_id TEXT PRIMARY KEY,
      deal_id TEXT,
      type TEXT,
      timestamp TEXT
    );

    -- Targets table
    CREATE TABLE IF NOT EXISTS targets (
      month TEXT PRIMARY KEY,
      target REAL NOT NULL
    );
  `);

  // Create indexes
  db.run(`CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_deals_account ON deals(account_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_deals_rep ON deals(rep_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_deals_closed_at ON deals(closed_at)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_activities_deal ON activities(deal_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_activities_timestamp ON activities(timestamp)`);

  // Load data from JSON files
  const possiblePaths = [
    path.join(__dirname, '../../data'),
    path.join(__dirname, '../../../data'),
    path.join(__dirname, '../../../skygeni-assignment-data'),
    path.join(process.cwd(), 'data'),
    path.join(process.cwd(), '../skygeni-assignment-data'),
  ];

  let finalDataDir = '';
  for (const p of possiblePaths) {
    if (fs.existsSync(p) && fs.existsSync(path.join(p, 'accounts.json'))) {
      finalDataDir = p;
      break;
    }
  }

  if (!finalDataDir) {
    console.error('Data directory not found. Tried:', possiblePaths);
    throw new Error('Data directory not found');
  }

  console.log(`Loading data from: ${finalDataDir}`);

  // Load accounts
  const accounts: Account[] = JSON.parse(
    fs.readFileSync(path.join(finalDataDir, 'accounts.json'), 'utf-8')
  );
  const insertAccount = db.prepare(
    'INSERT OR REPLACE INTO accounts (account_id, name, industry, segment) VALUES (?, ?, ?, ?)'
  );
  for (const a of accounts) {
    insertAccount.run([a.account_id, a.name, a.industry, a.segment]);
  }
  insertAccount.free();
  console.log(`Loaded ${accounts.length} accounts`);

  // Load reps
  const reps: Rep[] = JSON.parse(
    fs.readFileSync(path.join(finalDataDir, 'reps.json'), 'utf-8')
  );
  const insertRep = db.prepare(
    'INSERT OR REPLACE INTO reps (rep_id, name) VALUES (?, ?)'
  );
  for (const r of reps) {
    insertRep.run([r.rep_id, r.name]);
  }
  insertRep.free();
  console.log(`Loaded ${reps.length} reps`);

  // Load deals
  const deals: Deal[] = JSON.parse(
    fs.readFileSync(path.join(finalDataDir, 'deals.json'), 'utf-8')
  );
  const insertDeal = db.prepare(
    'INSERT OR REPLACE INTO deals (deal_id, account_id, rep_id, stage, amount, created_at, closed_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  for (const d of deals) {
    insertDeal.run([d.deal_id, d.account_id, d.rep_id, d.stage, d.amount, d.created_at, d.closed_at]);
  }
  insertDeal.free();
  console.log(`Loaded ${deals.length} deals`);

  // Load activities
  const activities: Activity[] = JSON.parse(
    fs.readFileSync(path.join(finalDataDir, 'activities.json'), 'utf-8')
  );
  const insertActivity = db.prepare(
    'INSERT OR REPLACE INTO activities (activity_id, deal_id, type, timestamp) VALUES (?, ?, ?, ?)'
  );
  for (const act of activities) {
    insertActivity.run([act.activity_id, act.deal_id, act.type, act.timestamp]);
  }
  insertActivity.free();
  console.log(`Loaded ${activities.length} activities`);

  // Load targets
  const targets: Target[] = JSON.parse(
    fs.readFileSync(path.join(finalDataDir, 'targets.json'), 'utf-8')
  );
  const insertTarget = db.prepare(
    'INSERT OR REPLACE INTO targets (month, target) VALUES (?, ?)'
  );
  for (const t of targets) {
    insertTarget.run([t.month, t.target]);
  }
  insertTarget.free();
  console.log(`Loaded ${targets.length} targets`);

  console.log('Database initialization complete!');

  // Log some stats
  const stats = db.exec(`
    SELECT
      (SELECT COUNT(*) FROM accounts) as accounts,
      (SELECT COUNT(*) FROM reps) as reps,
      (SELECT COUNT(*) FROM deals) as deals,
      (SELECT COUNT(*) FROM activities) as activities,
      (SELECT COUNT(*) FROM targets) as targets
  `)[0];

  if (stats && stats.values[0]) {
    console.log('Database stats:', {
      accounts: stats.values[0][0],
      reps: stats.values[0][1],
      deals: stats.values[0][2],
      activities: stats.values[0][3],
      targets: stats.values[0][4],
    });
  }
}

export function getDb(): SqlJsDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

// Helper to run a query and get results as objects
export function query<T>(sql: string, params: unknown[] = []): T[] {
  const stmt = db.prepare(sql);
  stmt.bind(params);

  const results: T[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as T;
    results.push(row);
  }
  stmt.free();

  return results;
}

// Helper to run a query and get a single result
export function queryOne<T>(sql: string, params: unknown[] = []): T | null {
  const results = query<T>(sql, params);
  return results.length > 0 ? results[0] : null;
}

export default { getDb, query, queryOne, initializeDatabase };
