const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure .cjs files are resolvable
if (!config.resolver.sourceExts.includes('cjs')) {
  config.resolver.sourceExts.push('cjs');
}

// Fix for Firebase v11+ "Component auth has not been registered yet" error
// by disabling Metro's experimental packageExports support.
config.resolver.unstable_enablePackageExports = false;

module.exports = config; 