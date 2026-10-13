const { AndroidConfig, withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const fs = require('node:fs/promises');
const path = require('node:path');

// allowBackup alone does not disable device transfers on every Android 12+ device.
// Exclude all private storage, including Expo SQLite's files/SQLite directory.
const excludes = ['root', 'file', 'database', 'sharedpref', 'external',
  'device_root', 'device_file', 'device_database', 'device_sharedpref']
  .map(domain => `    <exclude domain="${domain}" path="." />`).join('\n');

module.exports = function withPrivateAndroidBackup(config) {
  config = withAndroidManifest(config, mod => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(mod.modResults);
    app.$['android:allowBackup'] = 'false';
    app.$['android:fullBackupContent'] = '@xml/ghosted_backup_rules';
    app.$['android:dataExtractionRules'] = '@xml/ghosted_data_extraction_rules';
    return mod;
  });
  return withDangerousMod(config, ['android', async mod => {
    const dir = path.join(mod.modRequest.platformProjectRoot, 'app/src/main/res/xml');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'ghosted_backup_rules.xml'),
      `<?xml version="1.0" encoding="utf-8"?>\n<full-backup-content>\n${excludes}\n</full-backup-content>\n`);
    await fs.writeFile(path.join(dir, 'ghosted_data_extraction_rules.xml'),
      `<?xml version="1.0" encoding="utf-8"?>\n<data-extraction-rules>\n  <cloud-backup>\n${excludes}\n  </cloud-backup>\n  <device-transfer>\n${excludes}\n  </device-transfer>\n</data-extraction-rules>\n`);
    return mod;
  }]);
};
