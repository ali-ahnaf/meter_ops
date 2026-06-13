const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

// Source paths
const sourceStatic = path.join(root, '.next/static');
const sourcePublic = path.join(root, 'public');
const sourceDb = path.join(root, 'db.json');

// Target paths
const standaloneRoot = path.join(root, '.next/standalone');
const targetStatic = path.join(standaloneRoot, '.next/static');
const targetPublic = path.join(standaloneRoot, 'public');

// Production data store location read by app/actions.ts in production.
// Keep this in sync with getDbPath() in app/actions.ts.
const prodDb = '/var/www/meter-ops/db.json';

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

// Seed the production db.json from the repo copy, but never overwrite an
// existing store (it holds real meter readings). This only applies on the
// production host; on dev machines /var/www is not writable, so a failure
// here must not break the (already-completed) asset copy above.
try {
  if (fs.existsSync(prodDb)) {
    console.log(`✓ Existing data store kept at ${prodDb}`);
  } else if (fs.existsSync(sourceDb)) {
    fs.mkdirSync(path.dirname(prodDb), { recursive: true });
    fs.copyFileSync(sourceDb, prodDb);
    console.log(`→ Seeded ${sourceDb} → ${prodDb}`);
  } else {
    console.warn(`No db.json found to seed at ${prodDb}`);
  }
} catch (err) {
  console.warn(`Skipped seeding ${prodDb}: ${err.message}`);
}

console.log('✓ Standalone build is ready');
