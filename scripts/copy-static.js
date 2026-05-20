const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.join(__dirname, '..');

const resolveDatabasePath = () => {
  if (process.env.DATABASE_PATH) {
    return process.env.DATABASE_PATH;
  }

  if (process.env.NODE_ENV === 'production' && process.env.HOME) {
    return path.join(process.env.HOME, 'projectname.sqlite');
  }

  if (process.env.NODE_ENV === 'production') {
    return path.join(os.tmpdir(), 'projectname.sqlite');
  }

  return path.join(root, 'projectname.sqlite');
};

// Source paths
const sourceStatic = path.join(root, '.next/static');
const sourcePublic = path.join(root, 'public');
const sourceDb = resolveDatabasePath();

// Target paths
const standaloneRoot = path.join(root, '.next/standalone');
const targetStatic = path.join(standaloneRoot, '.next/static');
const targetPublic = path.join(standaloneRoot, 'public');
const targetDb = path.join(standaloneRoot, 'projectname.sqlite');

// Recursive copy helper
const copyDir = (src, dest) => {
  if (!fs.existsSync(src)) {
    console.warn(`Source directory does not exist: ${src}`);
    return;
  }

  fs.mkdirSync(dest, { recursive: true });

  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
};

console.log('Copying assets into standalone build...');

// Copy static assets
console.log(`→ ${sourceStatic} → ${targetStatic}`);
copyDir(sourceStatic, targetStatic);

// Copy public assets
console.log(`→ ${sourcePublic} → ${targetPublic}`);
copyDir(sourcePublic, targetPublic);

// Copy SQLite database
if (fs.existsSync(sourceDb)) {
  console.log(`→ ${sourceDb} → ${targetDb}`);
  fs.copyFileSync(sourceDb, targetDb);
  console.log('✓ dev.db copied');
} else {
  console.warn(`Database file not found at ${sourceDb}`);
}

console.log('✓ Standalone build is ready');
