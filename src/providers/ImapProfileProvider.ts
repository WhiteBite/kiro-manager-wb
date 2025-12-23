/**
 * IMAP Profile Provider
 * Manages IMAP profiles with email strategies
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import {
  ImapProfile,
  ImapProfilesData,
  EmailStrategy,
  EmailStrategyType,
  ProviderHint,
  EmailPoolItem
} from '../types';

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
  private storageUri: vscode.Uri;
  private _onDidChange = new vscode.EventEmitter<void>();
  private _syncingToSettings = false;
  private _syncingFromSettings = false;
  private _configChangeDisposable?: vscode.Disposable;

  readonly onDidChange = this._onDidChange.event;

  private constructor(private context: vscode.ExtensionContext) {
    this.storageUri = vscode.Uri.joinPath(context.globalStorageUri, 'imap-profiles.json');
    this.load();
    this._setupSettingsSync();
  }

  /**
   * Setup bidirectional sync with VS Code settings
   */
  private _setupSettingsSync(): void {
    // Settings sync disabled - profiles are managed via UI only
  }

  dispose(): void {
    this._configChangeDisposable?.dispose();
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
      const data = await vscode.workspace.fs.readFile(this.storageUri);
      const parsed: ImapProfilesData = JSON.parse(data.toString());

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
    } catch {
      // File doesn't exist or invalid - start fresh
      this.profiles = [];
      this.activeProfileId = undefined;

      // Migrate from old settings if exist
      await this.migrateFromOldSettings();
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
    const dir = vscode.Uri.joinPath(this.context.globalStorageUri);
    try {
      await vscode.workspace.fs.createDirectory(dir);
    } catch { /* ignore if exists */ }

    await vscode.workspace.fs.writeFile(
      this.storageUri,
      Buffer.from(JSON.stringify(data, null, 2))
    );

    // No longer sync to VS Code settings - profiles are standalone
    this._onDidChange.fire();
  }

  // ============================================
  // Settings Synchronization
  // ============================================

  /**
   * Sync active profile TO VS Code settings
   * Called when profile is saved/changed
   */
  private async _syncToSettings(): Promise<void> {
    if (this._syncingFromSettings) return;
    this._syncingToSettings = true;

    try {
      const profile = this.getActive();
      const config = vscode.workspace.getConfiguration('kiroAccountSwitcher');

      if (profile) {
        // Sync IMAP settings
        await config.update('imap.server', profile.imap.server, vscode.ConfigurationTarget.Global);
        await config.update('imap.user', profile.imap.user, vscode.ConfigurationTarget.Global);
        await config.update('imap.password', profile.imap.password, vscode.ConfigurationTarget.Global);
        await config.update('imap.port', profile.imap.port || 993, vscode.ConfigurationTarget.Global);

        // Sync email strategy
        await config.update('email.strategy', profile.strategy.type, vscode.ConfigurationTarget.Global);

        // Sync domain for catch_all
        if (profile.strategy.type === 'catch_all' && profile.strategy.domain) {
          await config.update('autoreg.emailDomain', profile.strategy.domain, vscode.ConfigurationTarget.Global);
        }

        // Sync email pool
        if (profile.strategy.type === 'pool' && profile.strategy.emails) {
          const emails = profile.strategy.emails.map(e => e.email);
          await config.update('email.pool', emails, vscode.ConfigurationTarget.Global);
        }
      }
    } catch (err) {
      console.error('[ImapProfileProvider] Failed to sync to settings:', err);
    } finally {
      this._syncingToSettings = false;
    }
  }

  /**
   * Sync FROM VS Code settings to active profile
   * Called when user changes settings via VS Code UI
   */
  private async _syncFromSettings(): Promise<void> {
    // Disabled: profiles should be managed via UI only, not synced from settings
    // This was causing profiles to be overwritten
  }

  /**
   * Force sync current profile to settings (public method)
   */
  async syncToSettings(): Promise<void> {
    await this._syncToSettings();
  }

  /**
   * Force sync from settings to profile (public method)
   */
  async syncFromSettings(): Promise<void> {
    await this._syncFromSettings();
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

  private async migrateFromOldSettings(): Promise<void> {
    const config = vscode.workspace.getConfiguration('kiroAccountSwitcher');
    const server = config.get<string>('imap.server');
    const user = config.get<string>('imap.user');
    const password = config.get<string>('imap.password');
    const domain = config.get<string>('autoreg.emailDomain');

    if (server && user && password) {
      // Determine strategy based on old settings
      let strategy: EmailStrategy;

      if (domain && domain !== user.split('@')[1]) {
        // Different domain = catch_all mode
        strategy = { type: 'catch_all', domain };
      } else {
        // Same domain = detect best strategy
        const recommended = this.getRecommendedStrategy(user);
        strategy = { type: recommended };
        if (recommended === 'catch_all') {
          strategy.domain = user.split('@')[1];
        }
      }

      await this.create({
        name: 'Migrated Profile',
        imap: { server, user, password },
        strategy,
        status: 'active'
      });

      console.log('[ImapProfileProvider] Migrated from old settings');
    }
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
