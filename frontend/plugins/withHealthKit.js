const { createRunOncePlugin, withEntitlementsPlist, withInfoPlist } = require('expo/config-plugins');

function withHealthKit(config) {
  config = withEntitlementsPlist(config, (mod) => {
    mod.modResults['com.apple.developer.healthkit'] = true;
    return mod;
  });

  config = withInfoPlist(config, (mod) => {
    mod.modResults.NSHealthShareUsageDescription =
      mod.modResults.NSHealthShareUsageDescription ||
      'Wrapped reads the health data you choose so it can build recap cards on your device.';
    mod.modResults.NSHealthUpdateUsageDescription =
      mod.modResults.NSHealthUpdateUsageDescription ||
      'Wrapped uses your health permissions to keep recap summaries in sync when you ask it to.';
    return mod;
  });

  return config;
}

module.exports = createRunOncePlugin(withHealthKit, 'with-healthkit', '1.0.0');
