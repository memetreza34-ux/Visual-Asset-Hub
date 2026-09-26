import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const ignoredDirectories = new Set(['.git', 'node_modules', 'dist', 'backups', '.local-storage', 'preview-cache']);
const allowedExtensions = new Set(['.json', '.js', '.mjs', '.md', '.yml', '.yaml', '.txt', '.cmd', '.html', '.css', '.env']);
const findings = [];

const detectors = [
  {
    name: 'Pexels API-Key',
    expression: /PEXELS_API(?:_KEY)?\s*=\s*["']?([A-Za-z0-9_-]{24,})/g,
    valueGroup: 1
  },
  {
    name: 'OpenAI API-Key',
    expression: /\b(sk-(?:proj-)?[A-Za-z0-9_-]{20,})\b/g,
    valueGroup: 1
  },
  {
    name: 'GitHub Token',
    expression: /\b(gh[pousr]_[A-Za-z0-9]{20,})\b/g,
    valueGroup: 1
  },
  {
    name: 'AWS Access Key',
    expression: /\b(AKIA[0-9A-Z]{16})\b/g,
    valueGroup: 1
  }
];

for (const file of collect(root)) {
  const text = fs.readFileSync(file, 'utf8');
  for (const detector of detectors) {
    detector.expression.lastIndex = 0;
    for (const match of text.matchAll(detector.expression)) {
      const value = match[detector.valueGroup] ?? match[0];
      if (isPlaceholder(value)) continue;
      const line = text.slice(0, match.index).split(/\r?\n/).length;
      findings.push(`${path.relative(root, file)}:${line} – möglicher ${detector.name}`);
    }
  }
}

if (findings.length) {
  console.error(`Secret-Scan fehlgeschlagen (${findings.length}):\n- ${findings.join('\n- ')}`);
  process.exit(1);
}

console.log('Secret-Scan erfolgreich: keine offensichtlichen API-Keys oder Tokens gefunden.');

function collect(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...collect(target));
    else if (entry.isFile() && shouldScan(entry.name)) files.push(target);
  }
  return files;
}

function shouldScan(name) {
  if (name === '.env.example') return true;
  return allowedExtensions.has(path.extname(name).toLowerCase());
}

function isPlaceholder(value) {
  return /^(dein|hier|example|examplekey|changeme|placeholder|test|dummy|xxx)/i.test(value);
}
