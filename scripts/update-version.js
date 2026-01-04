const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const releaseType = process.argv[2]; // 'major', 'minor', 'patch', or 'none'
if (!['major', 'minor', 'patch', 'none'].includes(releaseType)) {
    console.error('Usage: node update-version.js <major|minor|patch|none>');
    process.exit(1);
}

// 1. Update package.json (Source of Truth)
const packageJsonPath = path.resolve(__dirname, '../package.json');
const packageJson = require(packageJsonPath);
const oldVersion = packageJson.version;

// Helper to bump version
const bump = (v, type) => {
    if (type === 'none') return v;
    const parts = v.split('.').map(Number);
    if (type === 'major') { parts[0]++; parts[1] = 0; parts[2] = 0; }
    else if (type === 'minor') { parts[1]++; parts[2] = 0; }
    else if (type === 'patch') { parts[2]++; }
    return parts.join('.');
};

const newVersion = bump(oldVersion, releaseType);
if (releaseType === 'none') {
    console.log(`Keeping current version: ${newVersion}`);
} else {
    console.log(`Bumping version: ${oldVersion} -> ${newVersion}`);
}

packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

// 2. Update backend/tauri.conf.json
const tauriConfPath = path.resolve(__dirname, '../backend/tauri.conf.json');
if (fs.existsSync(tauriConfPath)) {
    const tauriConf = require(tauriConfPath);
    tauriConf.version = newVersion;
    fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n');
    console.log('Updated backend/tauri.conf.json');
} else {
    console.error('Warning: backend/tauri.conf.json not found');
}

// 3. Update backend/Cargo.toml
const cargoTomlPath = path.resolve(__dirname, '../backend/Cargo.toml');
if (fs.existsSync(cargoTomlPath)) {
    let cargoToml = fs.readFileSync(cargoTomlPath, 'utf8');
    // Replace version = "x.y.z" inside [package] block
    // This simple regex assumes version is near the top or standard format
    // A safer way for toml is complex regex or parser, but usually:
    // look for `name = "become-an-author"` followed eventually by `version = "..."`
    // OR just generic `version = "..."` replacement if unique enough.
    // Given standard cargo.toml, version is usually at the top under [package].

    const versionRegex = /^version\s*=\s*"[^"]+"/m;
    if (versionRegex.test(cargoToml)) {
        cargoToml = cargoToml.replace(versionRegex, `version = "${newVersion}"`);
        fs.writeFileSync(cargoTomlPath, cargoToml);
        console.log('Updated backend/Cargo.toml');
    } else {
        console.error('Warning: Could not find version field in Cargo.toml');
    }
} else {
    console.error('Warning: backend/Cargo.toml not found');
}

// Output new version
console.log(`Version updated to: ${newVersion}`);
