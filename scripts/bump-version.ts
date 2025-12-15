#!/usr/bin/env ts-node
/**
 * Bump version script
 * Usage: npx ts-node scripts/bump-version.ts [version]
 * 
 * If version is provided (e.g., "6.1.0"), uses that version.
 * Otherwise, auto-increments patch version.
 */

import * as fs from 'fs';
import * as path from 'path';

const packageJsonPath = path.join(__dirname, '..', 'package.json');

function bumpVersion(newVersion?: string): string {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const currentVersion = packageJson.version;

    let version: string;

    if (newVersion) {
        // Remove 'v' prefix if present
        version = newVersion.replace(/^v/, '');
    } else {
        // Auto-increment patch version
        const parts = currentVersion.split('.').map(Number);
        parts[2]++;
        version = parts.join('.');
    }

    packageJson.version = version;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

    console.log(`Version bumped: ${currentVersion} -> ${version}`);
    return version;
}

// Run if called directly
const newVersion = process.argv[2];
bumpVersion(newVersion);
