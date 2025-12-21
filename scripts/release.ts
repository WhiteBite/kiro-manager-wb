#!/usr/bin/env ts-node
/**
 * Release script - bumps version, commits, tags, and pushes
 * Usage: npx ts-node scripts/release.ts [major|minor|patch|x.y.z]
 * 
 * Examples:
 *   npx ts-node scripts/release.ts patch   -> 6.1.0 -> 6.1.1
 *   npx ts-node scripts/release.ts minor   -> 6.1.0 -> 6.2.0
 *   npx ts-node scripts/release.ts major   -> 6.1.0 -> 7.0.0
 *   npx ts-node scripts/release.ts 6.5.0   -> sets to 6.5.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const packageJsonPath = path.join(__dirname, '..', 'package.json');

function exec(cmd: string): string {
    console.log(`> ${cmd}`);
    return execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'inherit'] }).trim();
}

function getCurrentVersion(): string {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    return packageJson.version;
}

function bumpVersion(type: string): string {
    const current = getCurrentVersion();
    const parts = current.split('.').map(Number);

    switch (type) {
        case 'major':
            parts[0]++;
            parts[1] = 0;
            parts[2] = 0;
            break;
        case 'minor':
            parts[1]++;
            parts[2] = 0;
            break;
        case 'patch':
            parts[2]++;
            break;
        default:
            // Assume it's a version string like "6.5.0"
            if (/^\d+\.\d+\.\d+$/.test(type)) {
                return type;
            }
            throw new Error(`Invalid version type: ${type}. Use major, minor, patch, or x.y.z`);
    }

    return parts.join('.');
}

function updatePackageJson(version: string): void {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    packageJson.version = version;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
}

function main(): void {
    const type = process.argv[2] || 'patch';
    const currentVersion = getCurrentVersion();
    const newVersion = bumpVersion(type);

    console.log(`\n📦 Release: ${currentVersion} -> ${newVersion}\n`);

    // Update package.json
    updatePackageJson(newVersion);
    console.log(`✅ Updated package.json to ${newVersion}`);

    // Git operations
    try {
        exec('git add package.json');
        exec(`git commit -m "chore: bump version to ${newVersion}"`);

        // Delete local tag if exists
        try {
            exec(`git tag -d v${newVersion}`);
        } catch { }

        exec(`git tag v${newVersion}`);
        console.log(`✅ Created tag v${newVersion}`);

        exec('git push origin master');
        exec(`git push origin v${newVersion} --force`);
        console.log(`✅ Pushed to origin`);

        console.log(`\n🚀 Release v${newVersion} started!`);
        console.log(`   Check: https://github.com/WhiteBite/kiro-manager-wb/actions`);
    } catch (error) {
        console.error('❌ Git operation failed:', error);
        process.exit(1);
    }
}

main();
