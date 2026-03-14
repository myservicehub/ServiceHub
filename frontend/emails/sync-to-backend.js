/* Simple cross-platform sync from emails/html to backend/email_templates/html */
const fs = require('fs');
const path = require('path');

function ensureDir(p) {
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p, { recursive: true });
  }
}

function copyHtmlFiles(srcDir, destDir) {
  ensureDir(destDir);
  const files = fs.readdirSync(srcDir).filter(f => f.toLowerCase().endsWith('.html'));
  let copied = 0;
  for (const file of files) {
    const src = path.join(srcDir, file);
    const dest = path.join(destDir, file);
    fs.copyFileSync(src, dest);
    copied++;
  }
  console.log(`Synced ${copied} HTML file(s) from ${srcDir} -> ${destDir}`);
}

const SRC_DIR = path.resolve(__dirname, 'html');
const DEST_DIR = path.resolve(__dirname, '../../backend/email_templates/html');

if (!fs.existsSync(SRC_DIR)) {
  console.error(`Source directory not found: ${SRC_DIR}`);
  process.exit(1);
}

copyHtmlFiles(SRC_DIR, DEST_DIR);

