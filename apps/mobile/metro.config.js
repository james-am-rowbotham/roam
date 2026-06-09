const { getDefaultConfig } = require('@expo/metro-config');
const path = require('node:path');

// Monorepo setup so Metro can resolve + watch workspace packages (e.g. the pure
// @roam/core Journey Engine, which runs on device for offline planning).
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
