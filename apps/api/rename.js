const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Global replacements
  content = content.replace(/MELØ/g, 'MELØ');
  content = content.replace(/melø/g, 'melø');
  content = content.replace(/MELØ/g, 'MELØ');

  // Specific tagline addition in Sidebar
  if (filePath.endsWith('Sidebar.tsx')) {
    // Add tagline under the title
    content = content.replace(
      /<h1 className="[^"]*">MELØ<\/h1>/,
      `$&
        <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5 ml-0.5">Listen differently.</p>`
    );
  }

  // Specific tagline in Onboarding
  if (filePath.endsWith('onboarding\\page.tsx') || filePath.endsWith('onboarding/page.tsx')) {
    content = content.replace(
      /<h1 className="[^"]*">\s*Welcome to MELØ\s*<\/h1>/,
      `$&
            <p className="text-zinc-400 mt-2 text-sm">Listen differently.</p>`
    );
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated', filePath);
  }
}

function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  for (const file of files) {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (['node_modules', '.git', '.next', 'dist', 'python-deps'].includes(file)) continue;
      processDirectory(fullPath);
    } else {
      if (['.ts', '.tsx', '.md', '.js'].some(ext => fullPath.endsWith(ext))) {
        try {
          replaceInFile(fullPath);
        } catch(e) {}
      }
    }
  }
}

processDirectory(path.resolve(__dirname, '../../..'));
console.log('Global rename complete.');
