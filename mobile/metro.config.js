const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const repoRoot = path.resolve(projectRoot, '..');
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const config = getDefaultConfig(projectRoot);

// The pure billing/format logic lives in the web app's repo-root `lib/`.
config.watchFolders = [repoRoot];
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')];

// Don't crawl the web app's own dependencies and build output.
config.resolver.blockList = [
  new RegExp(`^${escapeRegExp(path.join(repoRoot, 'node_modules'))}/.*`),
  new RegExp(`^${escapeRegExp(path.join(repoRoot, '.next'))}/.*`),
  new RegExp(`^${escapeRegExp(path.join(repoRoot, '.git'))}/.*`),
];

module.exports = config;
