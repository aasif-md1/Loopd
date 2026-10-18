/**
 * Automated test scanning /src for forbidden icons per Section 0 of LOOPD_V2.md:
 * Forbidden icons: Sparkle, Sparkles, Star, MagicWand, Robot, Lightning
 */
const fs = require('fs');
const path = require('path');

const BANNED_ICONS = ['Sparkle', 'Sparkles', 'Star', 'MagicWand', 'Robot', 'Lightning'];
const SRC_DIR = path.resolve(__dirname, '../src');

function scanDir(dir, violations) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      scanDir(fullPath, violations);
    } else if (/\.(tsx|ts|jsx|js)$/.test(file)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const icon of BANNED_ICONS) {
        // Match import { ... Icon ... } from 'phosphor-react-native' or <Icon
        const importRegex = new RegExp(`\\bimport\\s*\\{[^}]*\\b${icon}\\b[^}]*\\}\\s*from`, 'm');
        const jsxRegex = new RegExp(`<${icon}\\b`, 'm');
        if (importRegex.test(content) || jsxRegex.test(content)) {
          violations.push({ file: fullPath, icon });
        }
      }
    }
  }
}

function runTest() {
  const violations = [];
  scanDir(SRC_DIR, violations);

  if (violations.length > 0) {
    console.error('FAILED: Found forbidden icons in /src:');
    violations.forEach((v) => {
      console.error(`- ${v.icon} in ${v.file}`);
    });
    process.exit(1);
  } else {
    console.log('PASSED: Zero forbidden icons found in /src.');
  }
}

runTest();
