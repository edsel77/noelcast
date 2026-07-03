const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '..', 'package.json');
const appJsonPath = path.join(__dirname, '..', 'app.json');
const buildGradlePath = path.join(__dirname, '..', 'android', 'app', 'build.gradle');

function syncVersion() {
  console.log('🔄 Synchronizing versions...');

  // 1. Read package.json
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const newVersion = packageJson.version;
  console.log(`📍 Source Version (package.json): ${newVersion}`);

  // 2. Update app.json
  let appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  const currentAppVersion = appJson.expo.version;

  if (newVersion === currentAppVersion) {
    console.error('❌ Build Cancelled: Version in package.json must be incremented before bundling.');
    console.error(`📍 Current version: ${currentAppVersion}`);
    process.exit(1);
  }

  const oldVersionCode = appJson.expo.android.versionCode;
  const newVersionCode = oldVersionCode + 1;

  appJson.expo.version = newVersion;
  appJson.expo.android.versionCode = newVersionCode;

  fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');
  console.log(`✅ Updated app.json: version=${newVersion}, versionCode=${newVersionCode}`);

  // 3. Update build.gradle (if android folder exists)
  if (!fs.existsSync(buildGradlePath)) {
    console.warn('⚠️  android/app/build.gradle not found — skipping Gradle update.');
    console.log('✨ Version synchronization complete (app.json only)!');
    return;
  }

  let buildGradle = fs.readFileSync(buildGradlePath, 'utf8');

  buildGradle = buildGradle.replace(/versionCode\s+(\d+)/, `versionCode ${newVersionCode}`);
  buildGradle = buildGradle.replace(/versionName\s+"([^"]+)"/, `versionName "${newVersion}"`);

  fs.writeFileSync(buildGradlePath, buildGradle);
  console.log(`✅ Updated build.gradle: versionName="${newVersion}", versionCode=${newVersionCode}`);
  console.log('✨ Version synchronization complete!');
}

syncVersion();
