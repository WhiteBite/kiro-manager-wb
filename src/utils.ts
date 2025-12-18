/**
 * Utility functions for paths and token operations
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { UsageStats } from './types';

export function getKiroAuthTokenPath(): string {
  return path.join(os.homedir(), '.aws', 'sso', 'cache', 'kiro-auth-token.json');
}

export function getTokensDir(): string {
  const config = vscode.workspace.getConfiguration('kiroAccountSwitcher');
  const customPath = config.get<string>('tokensPath', '');

  if (customPath && fs.existsSync(customPath)) {
    return customPath;
  }

  // ALWAYS use global path - tokens should NOT be project-specific!
  const globalPath = path.join(os.homedir(), '.kiro-batch-login', 'tokens');

  if (!fs.existsSync(globalPath)) {
    fs.mkdirSync(globalPath, { recursive: true });
  }

  return globalPath;
}

export function getUsageStatsPath(): string {
  return path.join(getTokensDir(), '..', 'usage-stats.json');
}

export function loadUsageStats(): UsageStats {
  const statsPath = getUsageStatsPath();
  if (!fs.existsSync(statsPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(statsPath, 'utf8'));
  } catch {
    return {};
  }
}

export function saveUsageStats(stats: UsageStats): void {
  const statsPath = getUsageStatsPath();
  fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
}

export interface KiroUsageData {
  currentUsage: number;
  usageLimit: number;
  percentageUsed: number;
  daysRemaining: number;
  expiryDate?: string;
  suspended?: boolean; // Account suspended by AWS
  suspendedReason?: string;
  isBanned?: boolean;  // Account is banned/blocked (auth error)
  banReason?: string;  // Reason for ban if known
}

export async function getKiroUsageFromDB(): Promise<KiroUsageData | null> {
  try {
    // Cross-platform Kiro DB path
    let dbPath: string;
    const platform = process.platform;

    if (platform === 'win32') {
      // Windows: %APPDATA%/Kiro/User/globalStorage/state.vscdb
      dbPath = path.join(
        process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'),
        'Kiro', 'User', 'globalStorage', 'state.vscdb'
      );
    } else if (platform === 'darwin') {
      // macOS: ~/Library/Application Support/Kiro/User/globalStorage/state.vscdb
      dbPath = path.join(
        os.homedir(), 'Library', 'Application Support',
        'Kiro', 'User', 'globalStorage', 'state.vscdb'
      );
    } else {
      // Linux: ~/.config/Kiro/User/globalStorage/state.vscdb
      dbPath = path.join(
        process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'),
        'Kiro', 'User', 'globalStorage', 'state.vscdb'
      );
    }

    if (!fs.existsSync(dbPath)) {
      console.log('Kiro DB not found at:', dbPath);
      return null;
    }

    // Copy DB to temp to avoid lock issues
    const tempDb = path.join(os.tmpdir(), `kiro_state_${Date.now()}.db`);
    fs.copyFileSync(dbPath, tempDb);

    let result: KiroUsageData | null = null;

    try {
      // Try better-sqlite3 first (works if native module is properly built)
      const Database = require('better-sqlite3');
      const db = new Database(tempDb, { readonly: true });

      try {
        const row = db.prepare("SELECT value FROM ItemTable WHERE key = 'kiro.kiroAgent'").get() as { value: string } | undefined;
        if (row) {
          result = parseKiroUsageData(row.value);
        }
      } finally {
        db.close();
      }
    } catch (sqliteErr) {
      console.log('better-sqlite3 failed, trying Python fallback:', sqliteErr);

      // Fallback to Python script
      result = await getKiroUsageViaPython(tempDb);
    }

    try { fs.unlinkSync(tempDb); } catch { }
    return result;
  } catch (err) {
    console.error('Failed to read Kiro usage:', err);
    return null;
  }
}

async function getKiroUsageViaPython(dbPath: string): Promise<KiroUsageData | null> {
  return new Promise((resolve) => {
    const { spawn, spawnSync } = require('child_process');
    const pythonCode = `
import sqlite3, json, sys
try:
    db = sqlite3.connect(sys.argv[1])
    cur = db.cursor()
    cur.execute("SELECT value FROM ItemTable WHERE key = 'kiro.kiroAgent'")
    row = cur.fetchone()
    if row:
        data = json.loads(row[0])
        usage = data.get('kiro.resourceNotifications.usageState', {})
        ft = usage.get('usageBreakdowns', [{}])[0].get('freeTrialUsage', {})
        print(json.dumps(ft))
    else:
        print('{}')
    db.close()
except Exception as e:
    print('{}')
`;

    // Detect python command (python3 on Linux/Mac, python on Windows)
    let pythonCmd = 'python';
    if (process.platform !== 'win32') {
      const py3Check = spawnSync('python3', ['--version'], { encoding: 'utf8' });
      if (py3Check.status === 0) {
        pythonCmd = 'python3';
      }
    }

    const proc = spawn(pythonCmd, ['-c', pythonCode, dbPath]);
    let output = '';

    proc.stdout.on('data', (data: Buffer) => { output += data.toString(); });
    proc.on('close', () => {
      try {
        const ft = JSON.parse(output.trim());
        if (ft.currentUsage !== undefined) {
          resolve({
            currentUsage: ft.currentUsage || 0,
            usageLimit: ft.usageLimit || 500,
            percentageUsed: ft.percentageUsed || 0,
            daysRemaining: ft.daysRemaining || 0,
            expiryDate: ft.expiryDate
          });
        } else {
          resolve(null);
        }
      } catch {
        resolve(null);
      }
    });

    proc.on('error', () => resolve(null));
    setTimeout(() => resolve(null), 5000); // Timeout
  });
}

function parseKiroUsageData(jsonValue: string): KiroUsageData | null {
  try {
    const data = JSON.parse(jsonValue);
    const usageState = data['kiro.resourceNotifications.usageState'];

    // Check for suspended account error
    const errorState = usageState?.error || data['kiro.resourceNotifications.error'];
    if (errorState) {
      const errorMsg = typeof errorState === 'string' ? errorState : JSON.stringify(errorState);
      if (errorMsg.includes('suspended') || errorMsg.includes('locked')) {
        console.log('Account is suspended:', errorMsg);
        return {
          currentUsage: 0,
          usageLimit: 0,
          percentageUsed: 100,
          daysRemaining: 0,
          suspended: true,
          suspendedReason: errorMsg
        };
      }
    }

    if (!usageState?.usageBreakdowns?.[0]?.freeTrialUsage) {
      console.log('No freeTrialUsage found in data');
      return null;
    }

    const freeTrialUsage = usageState.usageBreakdowns[0].freeTrialUsage;
    console.log('Found Kiro usage:', freeTrialUsage);
    return {
      currentUsage: freeTrialUsage.currentUsage || 0,
      usageLimit: freeTrialUsage.usageLimit || 500,
      percentageUsed: freeTrialUsage.percentageUsed || 0,
      daysRemaining: freeTrialUsage.daysRemaining || 0,
      expiryDate: freeTrialUsage.expiryDate
    };
  } catch (e) {
    console.error('Failed to parse Kiro usage data:', e);
    return null;
  }
}


// Get cached usage for account from local storage
export function getCachedAccountUsage(accountName: string): (KiroUsageData & { lastUpdated?: string; stale?: boolean }) | null {
  const usageFile = path.join(getTokensDir(), '..', 'account-usage.json');
  try {
    if (fs.existsSync(usageFile)) {
      const data = JSON.parse(fs.readFileSync(usageFile, 'utf8'));
      return data[accountName] || null;
    }
  } catch { }
  return null;
}

// Get all cached usage data
export function getAllCachedUsage(): Record<string, KiroUsageData & { lastUpdated?: string; stale?: boolean }> {
  const usageFile = path.join(getTokensDir(), '..', 'account-usage.json');
  try {
    if (fs.existsSync(usageFile)) {
      return JSON.parse(fs.readFileSync(usageFile, 'utf8'));
    }
  } catch { }
  return {};
}

// Save usage for account to local storage
export function saveAccountUsage(accountName: string, usage: KiroUsageData): void {
  const usageFile = path.join(getTokensDir(), '..', 'account-usage.json');
  let data: Record<string, KiroUsageData> = {};
  try {
    if (fs.existsSync(usageFile)) {
      data = JSON.parse(fs.readFileSync(usageFile, 'utf8'));
    }
  } catch { }
  data[accountName] = { ...usage, lastUpdated: new Date().toISOString() } as any;
  fs.writeFileSync(usageFile, JSON.stringify(data, null, 2));
}

// Fetch usage for a specific account - uses cached data since API is not available
export async function fetchAccountUsage(_accessToken: string): Promise<KiroUsageData | null> {
  // API endpoint is not publicly available, return null
  // Usage will be loaded from Kiro DB when account is active
  return null;
}

// Cache for account usage data
const usageCache: Map<string, { data: KiroUsageData; timestamp: number }> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getAccountUsageCached(accountName: string, accessToken: string): Promise<KiroUsageData | null> {
  const cached = usageCache.get(accountName);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const usage = await fetchAccountUsage(accessToken);
  if (usage) {
    usageCache.set(accountName, { data: usage, timestamp: Date.now() });
  }
  return usage;
}

// Clear usage cache for a specific account or all accounts
export function clearUsageCache(accountName?: string): void {
  if (accountName) {
    usageCache.delete(accountName);
  } else {
    usageCache.clear();
  }
}

// Invalidate cached usage data for account (marks as stale)
export function invalidateAccountUsage(accountName: string): void {
  usageCache.delete(accountName);

  // Also clear from file cache
  const usageFile = path.join(getTokensDir(), '..', 'account-usage.json');
  try {
    if (fs.existsSync(usageFile)) {
      const data = JSON.parse(fs.readFileSync(usageFile, 'utf8'));
      if (data[accountName]) {
        data[accountName].stale = true;
        fs.writeFileSync(usageFile, JSON.stringify(data, null, 2));
      }
    }
  } catch { }
}

// Check if cached usage is stale
export function isUsageStale(accountName: string): boolean {
  const usageFile = path.join(getTokensDir(), '..', 'account-usage.json');
  try {
    if (fs.existsSync(usageFile)) {
      const data = JSON.parse(fs.readFileSync(usageFile, 'utf8'));
      const cached = data[accountName];
      if (cached) {
        // Check if marked as stale
        if (cached.stale) return true;
        // Check if older than 5 minutes
        if (cached.lastUpdated) {
          const age = Date.now() - new Date(cached.lastUpdated).getTime();
          return age > CACHE_TTL;
        }
      }
    }
  } catch { }
  return true;
}
