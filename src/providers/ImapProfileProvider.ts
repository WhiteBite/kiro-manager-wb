/**
 * IMAP Profile Provider
 * Manages IMAP profiles with email strategies
 * 
 * Storage: ~/.kiro-manager-wb/profiles.json (independent of VS Code)
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import {
  ImapProfile,
  ImapProfilesData,
  EmailStrategy,
  EmailStrategyType,
  ProviderHint,
  EmailPoolItem
} from '../types';

// Storage path: ~/.kiro-manager-wb/profiles.json
const PROFILES_DIR = path.join(os.homedir(), '.kiro-manager-wb');
const PROFILES_FILE = path.join(PROFILES_DIR, 'profiles.json');

// Known email providers with their capabilities
const PROVIDER_HINTS: ProviderHint[] = [
  {
    name: 'Gmail',
    domains: ['gmail.com', 'googlemail.com'],
    imapServer: 'imap.gmail.com',
    imapPort: 993,
    supportsAlias: true,
    catchAllPossible: false,
    recommendedStrategy: 'plus_alias'
  },
  {
    name: 'Yandex',
    domains: ['yandex.ru', 'yandex.com', 'ya.ru'],
    imapServer: 'imap.yandex.ru',
    imapPort: 993,
    supportsAlias: true,
    catchAllPossible: true,
    recommendedStrategy: 'plus_alias'
  },
  {
    name: 'Mail.ru',
    domains: ['mail.ru', 'inbox.ru', 'list.ru', 'bk.ru'],
    imapServer: 'imap.mail.ru',
    imapPort: 993,
    supportsAlias: false,
    catchAllPossible: false,
    recommendedStrategy: 'single'
  },
  {
    name: 'Outlook',
    domains: ['outlook.com', 'hotmail.com', 'live.com'],
    imapServer: 'outlook.office365.com',
    imapPort: 993,
    supportsAlias: true,
    catchAllPossible: false,
    recommendedStrategy: 'plus_alias'
  },
  {
    name: 'GMX',
    domains: ['gmx.com', 'gmx.net', 'gmx.de'],
    imapServer: 'imap.gmx.com',
    imapPort: 993,
    supportsAlias: true,
    catchAllPossible: false,
    recommendedStrategy: 'plus_alias'
  },
  {
    name: 'ProtonMail',
    domains: ['protonmail.com', 'proton.me', 'pm.me'],
    imapServer: '127.0.0.1', // ProtonMail Bridge
    imapPort: 1143,
    supportsAlias: true,
    catchAllPossible: false,
    recommendedStrategy: 'plus_alias'
  },
  {
    name: 'iCloud',
    domains: ['icloud.com', 'me.com', 'mac.com'],
    imapServer: 'imap.mail.me.com',
    imapPort: 993,
    supportsAlias: false,
    catchAllPossible: false,
    recommendedStrategy: 'single'
  },
  {
    name: 'Fastmail',
    domains: ['fastmail.com', 'fastmail.fm'],
    imapServer: 'imap.fastmail.com',
    imapPort: 993,
    supportsAlias: true,
    catchAllPossible: true,
    recommendedStrategy: 'plus_alias'
  }
];

export class ImapProfileProvider {
  private static instance: ImapProfileProvider;
  private profiles: ImapProfile[] = [];
  private activeProfileId?: string;
  private _onDidChange = new vscode.EventEmitter<void>();
  private _fileWatcher?: fs.FSWatcher;

  readonly onDidChange = this._onDidChange.event;

  private constructor(private context: vscode.ExtensionContext) {
    this.load();
    this._setupFileWatcher();
  }

  /**
   * Watch profiles.json for external changes
   */
  private _setupFileWatcher(): void {
    try {
      // Ensure directory exists
      if (!fs.existsSync(PROFILES_DIR)) {
        fs.mkdirSync(PROFILES_DIR, { recursive: true });
      }

      // Watch for file changes (e.g., from standalone app)
      if (fs.existsSync(PROFILES_FILE)) {
        this._fileWatcher = fs.watch(PROFILES_FILE, (eventType) => {
          if (eventType === 'change') {
            console.log('[ImapProfileProvider] profiles.json changed externally, reloading...');
            this.load();
          }
        });
      }
    } catch (err) {
      console.error('[ImapProfileProvider] Failed to setup file watcher:', err);
    }
  }

  dispose(): void {
    this._fileWatcher?.close();
  }

  static getInstance(context?: vscode.ExtensionContext): ImapProfileProvider {
    if (!ImapProfileProvider.instance) {
      if (!context) {
        throw new Error('ImapProfileProvider requires context on first initialization');
      }
      ImapProfileProvider.instance = new ImapProfileProvider(context);
    }
    return ImapProfileProvider.instance;
  }

  // ============================================
  // CRUD Operations
  // ============================================

  // Current schema version - increment when making breaking changes
  private static readonly SCHEMA_VERSION = 2;

  async load(): Promise<void> {
    try {
      // Read from ~/.kiro-manager-wb/profiles.json
      if (!fs.existsSync(PROFILES_FILE)) {
        // No profiles file - start fresh
        this.profiles = [];
        this.activeProfileId = undefined;
        return;
      }

      const data = fs.readFileSync(PROFILES_FILE, 'utf-8');
      const parsed: ImapProfilesData = JSON.parse(data);

      // Schema migration
      const migratedData = this.migrateSchema(parsed);
      this.profiles = migratedData.profiles || [];
      this.activeProfileId = migratedData.activeProfileId;

      // Ensure all profiles have required fields
      this.profiles = this.profiles.map(p => this.migrateProfile(p));

      // Save if migration occurred
      if (parsed.version !== ImapProfileProvider.SCHEMA_VERSION) {
        await this.save();
        console.log(`[ImapProfileProvider] Migrated schema from v${parsed.version || 1} to v${ImapProfileProvider.SCHEMA_VERSION}`);
      }

      this._onDidChange.fire();
    } catch (err) {
      console.error('[ImapProfileProvider] Failed to load profiles:', err);
      // File doesn't exist or invalid - start fresh
      this.profiles = [];
      this.activeProfileId = undefined;
    }
  }

  /**
   * Migrate schema between versions
   */
  private migrateSchema(data: ImapProfilesData): ImapProfilesData {
    let version = data.version || 1;

    // v1 -> v2: Add stats.successRate field
    if (version < 2) {
      data.profiles = data.profiles.map(p => ({
        ...p,
        stats: {
          ...p.stats,
          successRate: p.stats.registered > 0
            ? Math.round((p.stats.registered / (p.stats.registered + p.stats.failed)) * 100)
            : 0
        }
      }));
      version = 2;
    }

    // Future migrations go here:
    // if (version < 3) { ... version = 3; }

    data.version = version;
    return data;
  }

  async save(): Promise<void> {
    const data: ImapProfilesData = {
      profiles: this.profiles,
      activeProfileId: this.activeProfileId,
      version: ImapProfileProvider.SCHEMA_VERSION
    };

    // Ensure directory exists
    if (!fs.existsSync(PROFILES_DIR)) {
      fs.mkdirSync(PROFILES_DIR, { recursive: true });
    }

    // Write to ~/.kiro-manager-wb/profiles.json
    fs.writeFileSync(PROFILES_FILE, JSON.stringify(data, null, 2), 'utf-8');

    this._onDidChange.fire();
  }

  // ============================================
  // Settings Synchronization (REMOVED - profiles are standalone)
  // ============================================

  /**
   * @deprecated No longer syncs to VS Code settings
   */
  async syncToSettings(): Promise<void> {
    // No-op: profiles are standalone, not synced to VS Code settings
  }

  /**
   * @deprecated No longer syncs from VS Code settings
   */
  async syncFromSettings(): Promise<void> {
    // No-op: profiles are standalone, not synced from VS Code settings
  }

  getAll(): ImapProfile[] {
    return [...this.profiles];
  }

  getById(id: string): ImapProfile | undefined {
    return this.profiles.find(p => p.id === id);
  }

  getActive(): ImapProfile | undefined {
    if (this.activeProfileId) {
      return this.getById(this.activeProfileId);
    }
    // Return first active profile or first profile
    return this.profiles.find(p => p.status === 'active') || this.profiles[0];
  }

  async create(profile: Omit<ImapProfile, 'id' | 'createdAt' | 'updatedAt' | 'stats'>): Promise<ImapProfile> {
    const now = new Date().toISOString();
    const newProfile: ImapProfile = {
      ...profile,
      id: this.generateId(),
      stats: { registered: 0, failed: 0 },
      createdAt: now,
      updatedAt: now,
      provider: this.detectProvider(profile.imap.user)
    };

    // If first profile, make it default
    if (this.profiles.length === 0) {
      newProfile.isDefault = true;
      this.activeProfileId = newProfile.id;
    }

    this.profiles.push(newProfile);
    await this.save();
    return newProfile;
  }

  async update(id: string, updates: Partial<ImapProfile>): Promise<ImapProfile | undefined> {
    const index = this.profiles.findIndex(p => p.id === id);
    if (index === -1) return undefined;

    this.profiles[index] = {
      ...this.profiles[index],
      ...updates,
      id, // Prevent id change
      updatedAt: new Date().toISOString()
    };

    // Re-detect provider if email changed
    if (updates.imap?.user) {
      this.profiles[index].provider = this.detectProvider(updates.imap.user);
    }

    await this.save();
    return this.profiles[index];
  }

  async delete(id: string): Promise<boolean> {
    const index = this.profiles.findIndex(p => p.id === id);
    if (index === -1) return false;

    this.profiles.splice(index, 1);

    // If deleted active profile, select another
    if (this.activeProfileId === id) {
      this.activeProfileId = this.profiles[0]?.id;
    }

    await this.save();
    return true;
  }

  async setActive(id: string): Promise<void> {
    if (this.profiles.some(p => p.id === id)) {
      this.activeProfileId = id;
      await this.save();
    }
  }

  // ============================================
  // Email Pool Operations
  // ============================================

  async addEmailsToPool(profileId: string, emails: string[]): Promise<void> {
    const profile = this.getById(profileId);
    if (!profile || profile.strategy.type !== 'pool') return;

    const existingEmails = new Set(profile.strategy.emails?.map(e => e.email.toLowerCase()) || []);
    const newItems: EmailPoolItem[] = emails
      .filter(e => !existingEmails.has(e.toLowerCase()))
      .map(email => ({ email, status: 'pending' as const }));

    profile.strategy.emails = [...(profile.strategy.emails || []), ...newItems];
    await this.update(profileId, { strategy: profile.strategy });
  }

  async updateEmailStatus(
    profileId: string,
    email: string,
    status: EmailPoolItem['status'],
    extra?: { error?: string; accountId?: string }
  ): Promise<void> {
    const profile = this.getById(profileId);
    if (!profile || profile.strategy.type !== 'pool') return;

    const item = profile.strategy.emails?.find(e => e.email.toLowerCase() === email.toLowerCase());
    if (item) {
      item.status = status;
      item.usedAt = status === 'used' ? new Date().toISOString() : item.usedAt;
      if (extra?.error) item.error = extra.error;
      if (extra?.accountId) item.accountId = extra.accountId;

      await this.update(profileId, { strategy: profile.strategy });
    }
  }

  getNextEmailFromPool(profileId: string): string | undefined {
    const profile = this.getById(profileId);
    if (!profile || profile.strategy.type !== 'pool') return undefined;

    return profile.strategy.emails?.find(e => e.status === 'pending')?.email;
  }

  // ============================================
  // Provider Detection
  // ============================================

  detectProvider(email: string): ImapProfile['provider'] | undefined {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return undefined;

    const hint = PROVIDER_HINTS.find(h => h.domains.includes(domain));
    if (hint) {
      return {
        name: hint.name,
        supportsAlias: hint.supportsAlias,
        catchAllPossible: hint.catchAllPossible
      };
    }

    // Custom domain - assume catch-all possible
    return {
      name: 'Custom Domain',
      supportsAlias: false,
      catchAllPossible: true
    };
  }

  getProviderHint(email: string): ProviderHint | undefined {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return undefined;
    return PROVIDER_HINTS.find(h => h.domains.includes(domain));
  }

  getRecommendedStrategy(email: string): EmailStrategyType {
    const hint = this.getProviderHint(email);
    return hint?.recommendedStrategy || 'single';
  }

  getAllProviderHints(): ProviderHint[] {
    return [...PROVIDER_HINTS];
  }

  // ============================================
  // Statistics
  // ============================================

  async recordSuccess(profileId: string): Promise<void> {
    const profile = this.getById(profileId);
    if (!profile) return;

    profile.stats.registered++;
    profile.stats.lastUsed = new Date().toISOString();
    await this.update(profileId, { stats: profile.stats });
  }

  async recordFailure(profileId: string, error?: string): Promise<void> {
    const profile = this.getById(profileId);
    if (!profile) return;

    profile.stats.failed++;
    profile.stats.lastError = error;
    profile.stats.lastUsed = new Date().toISOString();
    await this.update(profileId, { stats: profile.stats });
  }

  // ============================================
  // Helpers
  // ============================================

  private generateId(): string {
    return `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private migrateProfile(profile: Partial<ImapProfile>): ImapProfile {
    const now = new Date().toISOString();
    return {
      id: profile.id || this.generateId(),
      name: profile.name || 'Unnamed Profile',
      imap: profile.imap || { server: '', user: '', password: '' },
      strategy: profile.strategy || { type: 'single' },
      status: profile.status || 'active',
      stats: profile.stats || { registered: 0, failed: 0 },
      proxy: profile.proxy,  // Preserve proxy settings
      createdAt: profile.createdAt || now,
      updatedAt: profile.updatedAt || now,
      provider: profile.provider
    };
  }

  // ============================================
  // Export for Python autoreg
  // ============================================

  getActiveProfileEnv(): Record<string, string> {
    const profile = this.getActive();
    if (!profile) return {};

    const env: Record<string, string> = {
      IMAP_SERVER: profile.imap.server,
      IMAP_USER: profile.imap.user,
      IMAP_PASSWORD: profile.imap.password,
      IMAP_PORT: String(profile.imap.port || 993),
      EMAIL_STRATEGY: profile.strategy.type,
      PROFILE_ID: profile.id
    };

    if (profile.strategy.type === 'catch_all' && profile.strategy.domain) {
      env.EMAIL_DOMAIN = profile.strategy.domain;
    }

    if (profile.strategy.type === 'pool' && profile.strategy.emails) {
      const pending = profile.strategy.emails.filter(e => e.status === 'pending');
      // Format: email or email:password for different IMAP accounts
      env.EMAIL_POOL = JSON.stringify(pending.map(e =>
        e.password ? `${e.email}:${e.password}` : e.email
      ));
    }

    return env;
  }
}
