/**
 * E2E Test: Character Arc Workflow
 * Tests the complete user flow from creating a character to building an arc
 */

import { test, expect } from '@playwright/test';

test.describe('Character Arc Workflow', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to app and ensure test series exists
        await page.goto('/');
        // TODO: Setup test series and project
    });

    test('should create character arc from scratch', async ({ page }) => {
        // 1. Create a new character
        await page.click('[data-testid="codex-panel"]');
        await page.click('[data-testid="add-codex-entry"]');
        await page.fill('[data-testid="entry-name"]', 'Arc Test Character');
        await page.selectOption('[data-testid="entry-category"]', 'character');
        await page.fill('[data-testid="entry-description"]', 'A character for testing arcs');
        await page.click('[data-testid="save-entry"]');

        // 2. Navigate to Character Arc tab
        await page.click('[data-testid="tab-arc"]');

        // 3. Verify empty state
        await expect(page.locator('text=No arc points yet')).toBeVisible();
        await expect(page.locator('text=Add First Milestone')).toBeVisible();

        // 4. Add first arc point
        await page.click('text=Add First Milestone');
        await page.fill('[data-testid="arc-event-label"]', 'Book 1 - Beginning');
        await page.selectOption('[data-testid="arc-book-select"]', { label: 'Book 1' });
        await page.fill('[data-testid="arc-age"]', '25');
        await page.fill('[data-testid="arc-description"]', 'Character starts as a naive farm boy');
        await page.fill('[data-testid="arc-status"]', 'Farm Boy');

        // Add stats
        await page.locator('[data-testid="arc-stat-confidence"]').fill('20');
        await page.locator('[data-testid="arc-stat-magic"]').fill('5');

        // Save
        await page.click('text=Create Arc Point');

        // 5. Verify arc point appears on timeline
        await expect(page.locator('text=Book 1 - Beginning')).toBeVisible();
        await expect(page.locator('text=Age 25')).toBeVisible();
        await expect(page.locator('text=Farm Boy')).toBeVisible();

        // 6. Add Phase 5 context to arc point
        await page.click('text=Book 1 - Beginning'); // Click to edit

        // Expand Knowledge State
        await page.click('text=Knowledge & Beliefs');
        await page.fill('[data-testid="knows-input"]', 'How to farm');
        await page.keyboard.press('Enter');
        await page.fill('[data-testid="knows-input"]', 'Village customs');
        await page.keyboard.press('Enter');

        await page.fill('[data-testid="doesnt-know-input"]', 'Magic exists');
        await page.keyboard.press('Enter');
        await page.fill('[data-testid="doesnt-know-input"]', 'He is the chosen one');
        await page.keyboard.press('Enter');

        // Expand Emotional State
        await page.click('text=Emotional State');
        await page.selectOption('[data-testid="primary-emotion"]', 'hope');
        await page.fill('[data-testid="emotion-intensity"]', '6');
        await page.fill('[data-testid="mental-state-input"]', 'optimistic');
        await page.keyboard.press('Enter');

        // Expand Goals & Motivations
        await page.click('text=Goals & Motivations');
        await page.fill('[data-testid="primary-goal"]', 'Take care of family farm');
        await page.fill('[data-testid="fears-input"]', 'Crop failure');
        await page.keyboard.press('Enter');

        // Update
        await page.click('text=Update Arc Point');

        // 7. Verify Phase 5 context displays
        await expect(page.locator('text=Knows: How to farm')).toBeVisible();
        await expect(page.locator('text=Emotion: hope')).toBeVisible();
        await expect(page.locator('text=Goal: Take care of family farm')).toBeVisible();

        // 8. Add second arc point (transformation)
        await page.click('text=Add Milestone');
        await page.fill('[data-testid="arc-event-label"]', 'Book 2 - Discovers Powers');
        await page.selectOption('[data-testid="arc-book-select"]', { label: 'Book 2' });
        await page.fill('[data-testid="arc-age"]', '26');
        await page.fill('[data-testid="arc-description"]', 'Character learns they have magical powers');
        await page.fill('[data-testid="arc-status"]', 'Apprentice Mage');

        // Evolution in stats
        await page.locator('[data-testid="arc-stat-confidence"]').fill('45');
        await page.locator('[data-testid="arc-stat-magic"]').fill('30');

        // Phase 5: Updated knowledge
        await page.click('text=Knowledge & Beliefs');
        await page.fill('[data-testid="knows-input"]', 'Magic exists');
        await page.keyboard.press('Enter');
        await page.fill('[data-testid="knows-input"]', 'I have powers');
        await page.keyboard.press('Enter');

        await page.fill('[data-testid="doesnt-know-input"]', 'Ancient prophecy about me');
        await page.keyboard.press('Enter');

        await page.click('text=Create Arc Point');

        // 9. Verify  stats graph appears
        await expect(page.locator('text=Stats Over Time')).toBeVisible();
        await expect(page.locator('[data-testid="stats-chart"]')).toBeVisible();

        // 10. Verify timeline shows both points
        const timelineItems = page.locator('[data-testid="timeline-point"]');
        await expect(timelineItems).toHaveCount(2);

        // 11. Click on earlier point to verify edit works
        await page.click('text=Book 1 - Beginning');
        await expect(page.locator('text=Edit Arc Point')).toBeVisible();
        await page.click('text=Cancel');
    });

    test('should delete arc point', async ({ page }) => {
        // Setup: Create character with arc point
        // ... (abbreviated for brevity)

        // Navigate to arc
        await page.click('[data-testid="tab-arc"]');

        // Click arc point to edit
        await page.locator('[data-testid="timeline-point"]').first().click();

        // Delete button (if implemented)
        await page.click('[data-testid="delete-arc-point"]');

        // Confirm deletion
        await page.click('text=Delete');

        // Verify removed
        await expect(page.locator('text=No arc points yet')).toBeVisible();
    });

    test('should handle responsive timeline on mobile', async ({ page }) => {
        // Set mobile viewport
        await page.setViewportSize({ width: 375, height: 667 });

        // Navigate to character with arc
        // ... (setup)

        // Verify timeline is scrollable
        const timeline = page.locator('[data-testid="arc-timeline"]');
        await expect(timeline).toBeVisible();

        // Verify stats graph is responsive
        const chart = page.locator('[data-testid="stats-chart"]');
        const box = await chart.boundingBox();
        expect(box?.width).toBeLessThanOrEqual(375);
    });

    test('should integrate with AI chat context', async ({ page }) => {
        // Setup: Character with Phase 5 arc data
        // ... (create character with knowledge state)

        // Open chat
        await page.click('[data-testid="open-chat"]');

        // Include character in context
        await page.click('[data-testid="add-codex-context"]');
        await page.click('text=Arc Test Character');

        // Verify context includes Phase 5 fields
        const contextPreview = page.locator('[data-testid="chat-context-preview"]');
        await expect(contextPreview).toContainText('KNOWS:');
        await expect(contextPreview).toContainText('DOESN\'T KNOW YET:');
        await expect(contextPreview).toContainText('EMOTIONAL STATE:');

        // Send message and verify AI respects knowledge state
        await page.fill('[data-testid="chat-input"]', 'What does the character know about magic?');
        await page.click('[data-testid="send-chat"]');

        // AI should only mention what character knows
        const response = page.locator('[data-testid="chat-response"]').last();
        await expect(response).not.toContainText('Ancient prophecy'); // Character doesn't know this yet
    });
});

test.describe('Arc Migration', () => {
    test('should migrate existing character to arc format', async ({ page }) => {
        // 1. Create old-style character (no arc points)
        // ... (create character with only description field)

        // 2. Run migration
        await page.goto('/admin/migrations');
        await page.click('text=Run Codex Arc Migration');

        // 3. Verify migration  result
        await expect(page.locator('text=Migrated: 1')).toBeVisible();

        // 4. Check character now has initial arc point
        await page.goto('/codex/test-character');
        await page.click('[data-testid="tab-arc"]');

        // Should have auto-created arc point
        const arcPoints = page.locator('[data-testid="timeline-point"]');
        await expect(arcPoints).toHaveCount(1);
        await expect(page.locator('text=Beginning')).toBeVisible();
    });
});
