/* eslint-disable promise/always-return */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-require-imports */

const { generateFonts, FontAssetType, OtherAssetType } = require('@twbs/fantasticon');
const codepoints = require('./codepoints.json');
const fs = require('fs');

const outputDir = 'dist';

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// Generate the icon font
generateFonts({
  fontHeight: 1000,
  descent: 100,
  normalize: true,
  round: 10e12,
  name: 'kiricon',
  prefix: 'codicon',
  tag: 'i',
  codepoints,
  inputDir: 'src',
  outputDir,
  fontTypes: [FontAssetType.TTF],
  assetTypes: [OtherAssetType.CSS],
  templates: {
    css: './styles.hbs',
  },
})
  .then((results) => {
    console.log('✅ Icon font generated successfully!');
    console.log('Generated files:');
    console.log(results);
  })
  .catch((error) => {
    console.error('❌ Error generating icon font:', error);
    process.exit(1);
  });
