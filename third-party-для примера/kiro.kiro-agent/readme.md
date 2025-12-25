# Kiro Extension

The Kiro extension powers an AI-integrated, spec-based development environment. Customers define systems and their components using a friendly, natural language based specification in a local application which in turn produces code for deployment.

## Build Process and Bundling Strategy

This extension uses a sophisticated bundling strategy to minimize the number of files in the final package while preserving functionality for packages that cannot be bundled.

### Overview

The extension uses ESBuild to bundle most dependencies into the main extension file (`dist/extension.js`), but keeps certain packages external due to:

- Native binaries that can't be bundled
- Dynamic requires or runtime constraints
- Platform-specific dependencies
- VSCode runtime provided modules

### External Dependencies Management

We use an automated system to manage which packages remain external (unbundled):

#### The `analyze-externals` Script

The `scripts/analyze-externals.mjs` script maintains consistency between:

- `scripts/esbuild.mjs` - ESBuild external packages list (auto-generated section only)
- `.vscodeignore` - Extension packaging exclusions (auto-generated section only)

**What it does:**

1. Reads the curated `UNBUNDLEABLE_PACKAGES` list
2. Updates auto-generated sections in both configuration files using START/END markers
3. Runs automatically during all build processes
4. Preserves manual entries outside the auto-generated sections

**Usage:**

```bash
npm run analyze-externals
```

#### Adding New External Dependencies

If you need to add a package that cannot be bundled:

1. **Add to the curated list**: Edit `scripts/analyze-externals.mjs` and add the package to the `UNBUNDLEABLE_PACKAGES` array:

   ```javascript
   const UNBUNDLEABLE_PACKAGES = [
     // ... existing packages
     'your-new-package',
   ];
   ```

2. **Categorize appropriately**: Place it in the correct section:

   - `// VSCode runtime provided` - for vscode module
   - `// Native binaries that can't be bundled` - for packages with .node files
   - `// ESBuild and platform-specific binaries` - for @esbuild/\* packages
   - `// Runtime dependencies with native binaries or dynamic requires`
   - `// Relative imports that can't be bundled`

3. **Run the script**: The changes will be applied automatically during the next build, or run manually:
   ```bash
   npm run analyze-externals
   ```

#### Manual Exceptions

**esbuild.mjs manual externals** - Some packages need to be external to ESBuild bundling:

```javascript
// Manual externals (esbuild-specific, not in .vscodeignore)
'vscode',           // Provided by VSCode runtime
'./xhr-sync-worker.js',  // Relative import - kept as separate file, not bundled into main
```

**\*.vscodeignore manual exceptions** - Some packages need to be included in the extension package for runtime use but are not directly imported by the bundled code:

```gitignore
# Keep dependencies of native binary packages
!node_modules/@lancedb/
!node_modules/@vscode/ripgrep/
```

Only add manual .vscodeignore exceptions for packages that:

- Contain native binaries needed at runtime
- Are dynamically loaded by other dependencies
- Are not directly imported by the main extension code

### Build Commands

- `npm run compile` - Build all components
- `npm run package` - Compile code only
- `npm run release` - Full build with extension packaging
- `npm run analyze-externals` - Update external dependencies configuration

## Security

See [CONTRIBUTING](https://github.com/kiro-team/kiro-extension/blob/main/CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This project is licensed under the Apache-2.0 License.
