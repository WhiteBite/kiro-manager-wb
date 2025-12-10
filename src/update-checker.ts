/**
 * Update checker - checks GitHub releases for new versions
 */

import * as vscode from 'vscode';
import * as https from 'https';

// GitHub repo info - UPDATE THIS when you create the repo
const GITHUB_OWNER = 'YOUR_USERNAME';
const GITHUB_REPO = 'kiro-extension';

interface GitHubRelease {
  tag_name: string;
  html_url: string;
  name: string;
  published_at: string;
}

export async function checkForUpdates(context: vscode.ExtensionContext): Promise<void> {
  const currentVersion = context.extension.packageJSON.version;
  const lastCheck = context.globalState.get<number>('lastUpdateCheck', 0);
  const now = Date.now();
  
  // Check at most once per day
  if (now - lastCheck < 24 * 60 * 60 * 1000) {
    return;
  }
  
  try {
    const latestRelease = await getLatestRelease();
    if (!latestRelease) return;
    
    await context.globalState.update('lastUpdateCheck', now);
    
    const latestVersion = latestRelease.tag_name.replace(/^v/, '');
    
    if (isNewerVersion(latestVersion, currentVersion)) {
      await context.globalState.update('availableUpdate', {
        version: latestVersion,
        url: latestRelease.html_url,
        name: latestRelease.name
      });
      
      showUpdateNotification(latestVersion, latestRelease.html_url);
    } else {
      await context.globalState.update('availableUpdate', null);
    }
  } catch (error) {
    console.error('Failed to check for updates:', error);
  }
}

export function getAvailableUpdate(context: vscode.ExtensionContext): { version: string; url: string; name: string } | null {
  return context.globalState.get('availableUpdate', null);
}

async function getLatestRelease(): Promise<GitHubRelease | null> {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
      method: 'GET',
      headers: {
        'User-Agent': 'kiro-account-switcher',
        'Accept': 'application/vnd.github.v3+json'
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      });
    });
    
    req.on('error', () => {
      resolve(null);
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      resolve(null);
    });
    
    req.end();
  });
}

function isNewerVersion(latest: string, current: string): boolean {
  const latestParts = latest.split('.').map(Number);
  const currentParts = current.split('.').map(Number);
  
  for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
    const l = latestParts[i] || 0;
    const c = currentParts[i] || 0;
    
    if (l > c) return true;
    if (l < c) return false;
  }
  
  return false;
}

function showUpdateNotification(version: string, url: string): void {
  vscode.window.showInformationMessage(
    `Kiro Account Switcher v${version} available!`,
    'Download',
    'Later'
  ).then((selection) => {
    if (selection === 'Download') {
      vscode.env.openExternal(vscode.Uri.parse(url));
    }
  });
}
