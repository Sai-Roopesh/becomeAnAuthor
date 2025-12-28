/**
 * Unit Tests for TauriCodexRepository Arc Methods
 * Tests CRUD operations for arc points
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TauriCodexRepository } from '../TauriCodexRepository';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { ArcPoint, CodexEntry } from '@/domain/entities/types';

describe('TauriCodexRepository - Arc Points', () => {
    let repo: TauriCodexRepository;
    let testSeriesId: string;
    let testEntryId: string;

    beforeEach(async () => {
        repo = new TauriCodexRepository();
        testSeriesId = 'test-series-123';

        // Create a test character entry
        const entry = await repo.create({
            projectId: 'test-project',
            name: 'Test Character',
            category: 'character',
            seriesId: testSeriesId,
            coreDescription: 'A test character for arc testing',
            arcPoints: [],
        });
        testEntryId = entry.id;
    });

    describe('addArcPoint', () => {
        it('should add an arc point to an entry', async () => {
            const arcPoint = {
                eventType: 'book' as const,
                eventLabel: 'Book 1 - Beginning',
                bookId: 'book-1',
                timestamp: Date.now(),
                description: 'Character is introduced',
                age: 25,
                stats: { confidence: 30 },
                relationships: { 'Friend': 'new ally' },
            };

            const arcPointId = await repo.addArcPoint(testSeriesId, testEntryId, arcPoint);

            expect(arcPointId).toBeDefined();

            const entry = await repo.get(testEntryId);
            expect(entry?.arcPoints).toHaveLength(1);
            expect(entry?.arcPoints[0].eventLabel).toBe('Book 1 - Beginning');
            expect(entry?.arcPoints[0].age).toBe(25);
        });

        it('should add Phase 5 fields to arc point', async () => {
            const arcPoint = {
                eventType: 'book' as const,
                eventLabel: 'Book 2 - Revelation',
                timestamp: Date.now(),
                description: 'Character learns the truth',
                stats: {},
                relationships: {},
                knowledgeState: {
                    knows: ['Secret identity revealed'],
                    doesNotKnow: ['Mentor is traitor'],
                    believes: ['Quest will succeed'],
                    misconceptions: [],
                },
                emotionalState: {
                    primaryEmotion: 'shock',
                    intensity: 9,
                    mentalState: ['confused', 'betrayed'],
                    internalConflict: 'Trust vs. suspicion',
                },
                goalsAndMotivations: {
                    primaryGoal: 'Find the truth',
                    secondaryGoals: [],
                    fears: ['Being deceived again'],
                    desires: ['Justice'],
                    obstacles: ['Lack of allies'],
                },
            };

            await repo.addArcPoint(testSeriesId, testEntryId, arcPoint);

            const entry = await repo.get(testEntryId);
            const savedPoint = entry?.arcPoints[0];

            expect(savedPoint?.knowledgeState?.knows).toContain('Secret identity revealed');
            expect(savedPoint?.emotionalState?.primaryEmotion).toBe('shock');
            expect(savedPoint?.goalsAndMotivations?.primaryGoal).toBe('Find the truth');
        });

        it('should throw error for non-existent entry', async () => {
            await expect(
                repo.addArcPoint(testSeriesId, 'non-existent-id', {
                    eventType: 'book',
                    eventLabel: 'Test',
                    timestamp: Date.now(),
                    description: 'Test',
                    stats: {},
                    relationships: {},
                })
            ).rejects.toThrow('Entry not found');
        });
    });

    describe('updateArcPoint', () => {
        it('should update an existing arc point', async () => {
            // Add initial arc point
            const arcPointId = await repo.addArcPoint(testSeriesId, testEntryId, {
                eventType: 'book',
                eventLabel: 'Initial Label',
                timestamp: Date.now(),
                description: 'Initial description',
                stats: { confidence: 30 },
                relationships: {},
            });

            // Update it
            await repo.updateArcPoint(testSeriesId, testEntryId, arcPointId, {
                eventLabel: 'Updated Label',
                description: 'Updated description',
                stats: { confidence: 60 },
            });

            const entry = await repo.get(testEntryId);
            const updatedPoint = entry?.arcPoints.find(p => p.id === arcPointId);

            expect(updatedPoint?.eventLabel).toBe('Updated Label');
            expect(updatedPoint?.stats.confidence).toBe(60);
        });

        it('should update Phase 5 fields', async () => {
            const arcPointId = await repo.addArcPoint(testSeriesId, testEntryId, {
                eventType: 'book',
                eventLabel: 'Test',
                timestamp: Date.now(),
                description: 'Test',
                stats: {},
                relationships: {},
            });

            await repo.updateArcPoint(testSeriesId, testEntryId, arcPointId, {
                knowledgeState: {
                    knows: ['New information'],
                    doesNotKnow: [],
                    believes: [],
                    misconceptions: [],
                },
            });

            const entry = await repo.get(testEntryId);
            const point = entry?.arcPoints[0];
            expect(point?.knowledgeState?.knows).toContain('New information');
        });
    });

    describe('deleteArcPoint', () => {
        it('should delete an arc point', async () => {
            const arcPointId = await repo.addArcPoint(testSeriesId, testEntryId, {
                eventType: 'book',
                eventLabel: 'To be deleted',
                timestamp: Date.now(),
                description: 'Test',
                stats: {},
                relationships: {},
            });

            await repo.deleteArcPoint(testSeriesId, testEntryId, arcPointId);

            const entry = await repo.get(testEntryId);
            expect(entry?.arcPoints).toHaveLength(0);
        });
    });

    describe('getArcPointsForBook', () => {
        it('should return arc points for a specific book', async () => {
            // Create multiple entries with arc points
            const entry1Id = testEntryId;
            const entry2 = await repo.create({
                projectId: 'test-project',
                name: 'Character 2',
                category: 'character',
                seriesId: testSeriesId,
                coreDescription: 'Second character',
                arcPoints: [],
            });

            await repo.addArcPoint(testSeriesId, entry1Id, {
                eventType: 'book',
                eventLabel: 'Book 1',
                bookId: 'book-1',
                timestamp: Date.now(),
                description: 'Entry 1 in Book 1',
                stats: {},
                relationships: {},
            });

            await repo.addArcPoint(testSeriesId, entry2.id, {
                eventType: 'book',
                eventLabel: 'Book 1',
                bookId: 'book-1',
                timestamp: Date.now(),
                description: 'Entry 2 in Book 1',
                stats: {},
                relationships: {},
            });

            const arcPoints = await repo.getArcPointsForBook(testSeriesId, 'book-1');

            expect(arcPoints.size).toBe(2);
            expect(arcPoints.get(entry1Id)?.eventLabel).toBe('Book 1');
            expect(arcPoints.get(entry2.id)?.eventLabel).toBe('Book 1');
        });

        it('should return most recent arc point if no exact book match', async () => {
            // Add multiple arc points with different timestamps
            await repo.addArcPoint(testSeriesId, testEntryId, {
                eventType: 'book',
                eventLabel: 'Early',
                timestamp: 1000,
                description: 'Early state',
                stats: {},
                relationships: {},
            });

            await repo.addArcPoint(testSeriesId, testEntryId, {
                eventType: 'book',
                eventLabel: 'Later',
                timestamp: 2000,
                description: 'Later state',
                stats: {},
                relationships: {},
            });

            const arcPoints = await repo.getArcPointsForBook(testSeriesId, 'unknown-book');

            // Should return most recent
            const point = arcPoints.get(testEntryId);
            expect(point?.eventLabel).toBe('Later');
        });
    });

    describe('getBySeries', () => {
        it('should return all entries for a series', async () => {
            // Create another entry
            await repo.create({
                projectId: 'test-project',
                name: 'Character 2',
                category: 'character',
                seriesId: testSeriesId,
                coreDescription: 'Another character',
                arcPoints: [],
            });

            const entries = await repo.getBySeries(testSeriesId);

            expect(entries.length).toBeGreaterThanOrEqual(2);
            expect(entries.every(e => e.seriesId === testSeriesId)).toBe(true);
        });
    });
});
