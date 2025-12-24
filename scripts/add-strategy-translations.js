/**
 * Add strategy translations to all locale files
 */

const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '..', 'src', 'webview', 'i18n', 'locales');
const langs = ['zh', 'es', 'pt', 'ja', 'de', 'fr', 'ko', 'hi'];

const translations = `
  // Registration Strategies (Anti-Ban)
  registrationStrategy: 'Registration Strategy',
  registrationStrategyDesc: 'Choose how to register accounts (affects ban risk)',
  strategyWebView: 'WebView (Recommended)',
  strategyWebViewDesc: 'Opens real browser, you enter credentials manually. Minimal ban risk.',
  strategyWebViewBanRisk: 'Low ban risk (<10%)',
  strategyAutomated: 'Automated (Legacy)',
  strategyAutomatedDesc: 'Automated browser with DrissionPage. Works for some users.',
  strategyAutomatedBanRisk: 'Medium-High ban risk (40-90%)',
  deferQuotaCheck: 'Defer quota check',
  deferQuotaCheckDesc: 'Do NOT check quota immediately after registration (reduces ban risk)',
  manualInputRequired: 'Manual input required',
  lowBanRisk: 'Low ban risk',
  mediumBanRisk: 'Medium ban risk',
  highBanRisk: 'High ban risk',
};`;

langs.forEach(lang => {
    const filePath = path.join(localesDir, `${lang}.ts`);

    if (!fs.existsSync(filePath)) {
        console.log(`Skipping ${lang} - file not found`);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');

    // Check if already added
    if (content.includes('registrationStrategy:')) {
        console.log(`Skipping ${lang} - already has translations`);
        return;
    }

    // Replace closing }; with translations + };
    content = content.replace(/};$/, translations);

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Updated ${lang}`);
});

console.log('\nDone!');
