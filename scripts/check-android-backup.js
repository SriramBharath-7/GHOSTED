const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const config = require('../app.json').expo;
assert.equal(config.android.allowBackup, false);
const native = path.join(root, 'android/app/src/main');
const manifest = fs.readFileSync(path.join(native, 'AndroidManifest.xml'), 'utf8');
assert.match(manifest, /android:allowBackup="false"/);
assert.match(manifest, /android:fullBackupContent="@xml\/ghosted_backup_rules"/);
assert.match(manifest, /android:dataExtractionRules="@xml\/ghosted_data_extraction_rules"/);

const legacy = fs.readFileSync(path.join(native, 'res/xml/ghosted_backup_rules.xml'), 'utf8');
const modern = fs.readFileSync(path.join(native, 'res/xml/ghosted_data_extraction_rules.xml'), 'utf8');
const cloud = modern.match(/<cloud-backup>([\s\S]*?)<\/cloud-backup>/)?.[1];
const transfer = modern.match(/<device-transfer>([\s\S]*?)<\/device-transfer>/)?.[1];
for (const rules of [legacy, cloud, transfer]) {
  assert.ok(rules, 'Missing backup rules');
  for (const domain of ['root', 'file', 'database', 'sharedpref', 'external',
    'device_root', 'device_file', 'device_database', 'device_sharedpref']) {
    assert.ok(rules.includes(`<exclude domain="${domain}" path="." />`), `Missing ${domain} exclusion`);
  }
}
console.log('PASS: Android manifest, cloud backup, and device-transfer privacy rules.');
