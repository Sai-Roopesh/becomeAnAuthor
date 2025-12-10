/**
 * Test Script for API Key Migration
 * Run this in browser console to test the migration functionality
 * 
 * Usage:
 * 1. Open DevTools Console (Cmd+Option+J on Mac)
 * 2. Copy/paste this entire script
 * 3. Restart the app
 * 4. Check console for migration messages
 * 5. Verify keys in OS Keychain (macOS: Keychain Access app)
 */

// Add fake API keys to localStorage (simulates legacy storage)
function setupTestKeys() {
    console.log('🧪 Setting up test API keys in localStorage...');

    localStorage.setItem('ai-api-key-openai', 'sk-test-openai-key-12345678901234567890123456789012');
    localStorage.setItem('ai-api-key-anthropic', 'sk-ant-test-anthropic-key-1234567890');
    localStorage.setItem('ai-api-key-google', 'AIzaSyTest-Google-API-Key-123456789012');
    localStorage.setItem('ai-api-key-openrouter', 'sk-or-test-openrouter-key-12345678');

    console.log('✅ Added 4 test API keys to localStorage');
    console.log('Keys added:', {
        openai: localStorage.getItem('ai-api-key-openai')?.substring(0, 20) + '...',
        anthropic: localStorage.getItem('ai-api-key-anthropic')?.substring(0, 20) + '...',
        google: localStorage.getItem('ai-api-key-google')?.substring(0, 20) + '...',
        openrouter: localStorage.getItem('ai-api-key-openrouter')?.substring(0, 20) + '...',
    });

    console.log('\n📝 Next steps:');
    console.log('1. Restart the app (close and reopen)');
    console.log('2. Check console for migration messages');
    console.log('3. Run checkMigration() to verify keys were moved');
}

// Check if keys were migrated
function checkMigration() {
    console.log('🔍 Checking migration status...');

    const providers = ['openai', 'anthropic', 'google', 'openrouter'];
    const remaining = providers.filter(p => localStorage.getItem(`ai-api-key-${p}`) !== null);

    if (remaining.length === 0) {
        console.log('✅ Migration successful! All keys removed from localStorage');
        console.log('🔐 Keys should now be in OS Keychain');
        console.log('\nTo verify in macOS:');
        console.log('1. Open Keychain Access app');
        console.log('2. Search for "com.becomeauthor.app"');
        console.log('3. You should see entries like "api-key-openai"');
    } else {
        console.log('⚠️  Migration incomplete or not run yet');
        console.log('Remaining keys in localStorage:', remaining);
        console.log('Try restarting the app again');
    }
}

// Clean up test keys (if migration fails)
function cleanupTestKeys() {
    console.log('🧹 Cleaning up test keys...');

    localStorage.removeItem('ai-api-key-openai');
    localStorage.removeItem('ai-api-key-anthropic');
    localStorage.removeItem('ai-api-key-google');
    localStorage.removeItem('ai-api-key-openrouter');

    console.log('✅ Test keys removed from localStorage');
}

// Export functions to window for easy access
window.testMigration = {
    setup: setupTestKeys,
    check: checkMigration,
    cleanup: cleanupTestKeys,
};

console.log('🧪 API Key Migration Test Script Loaded');
console.log('Available commands:');
console.log('  testMigration.setup()   - Add fake keys to localStorage');
console.log('  testMigration.check()   - Check if migration succeeded');
console.log('  testMigration.cleanup() - Remove test keys');
console.log('\nStart with: testMigration.setup()');
