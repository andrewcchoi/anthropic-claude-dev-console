const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '../node_modules/monaco-editor/min');
const dest = path.join(__dirname, '../public/monaco-editor/min');

// Recursively copy directory
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Clean and copy
if (fs.existsSync(dest)) {
  fs.rmSync(dest, { recursive: true });
}
copyDir(src, dest);
console.log('✓ Monaco Editor assets copied to public/monaco-editor/min');
