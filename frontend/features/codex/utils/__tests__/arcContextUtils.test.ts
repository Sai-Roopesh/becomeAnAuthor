/**
 * Arc Context Utils Tests
 * Tests for series-aware arc point selection
 */

import { describe, it, expect } from 'vitest';
import { findMostRecentArcPoint } from '../arcContextUtils';
import type { ArcPoint, Project } from '@/domain/entities/types';

// Helper to create mock arc point
const createArcPoint = (bookId: string, timestamp: number): ArcPoint => ({
    id: `arc-${bookId}-${timestamp}`,
    bookId,
    eventLabel: 'Test Event',
    description: 'Test description',
    timestamp,
    relationships: {},
});

// Helper to create mock project
const createProject = (id: string, seriesId?: string, seriesIndex?: string): Project => {
    const project: Project = {
        id,
        title: `Project ${id}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };
    if (seriesId !== undefined) project.seriesId = seriesId;
    if (seriesIndex !== undefined) project.seriesIndex = seriesIndex;
    return project;
};

describe('arcContextUtils', () => {
    describe('findMostRecentArcPoint', () => {
        it('should return null for empty arc points', () => {
            const project = createProject('book-1');
            expect(findMostRecentArcPoint([], project)).toBe(null);
            expect(findMostRecentArcPoint(undefined, project)).toBe(null);
        });

        it('should return exact match when arc point belongs to current book', () => {
            const project = createProject('book-1');
            const arcPoints = [
                createArcPoint('book-1', 1000),
                createArcPoint('book-2', 2000),
            ];

            const result = findMostRecentArcPoint(arcPoints, project);
            expect(result?.bookId).toBe('book-1');
        });

        it('should return most recent by timestamp when no series context', () => {
            const project = createProject('book-3');
            const arcPoints = [
                createArcPoint('book-1', 1000),
                createArcPoint('book-2', 2000),
            ];

            const result = findMostRecentArcPoint(arcPoints, project);
            expect(result?.bookId).toBe('book-2'); // Most recent
        });

        it('should respect series order when allProjects provided', () => {
            const project = createProject('book-3', 'series-1', 'Book 3');
            const allProjects = [
                createProject('book-1', 'series-1', 'Book 1'),
                createProject('book-2', 'series-1', 'Book 2'),
                createProject('book-3', 'series-1', 'Book 3'),
            ];
            const arcPoints = [
                createArcPoint('book-1', 3000), // Newer timestamp but earlier book
                createArcPoint('book-2', 1000), // Older timestamp but later book
            ];

            const result = findMostRecentArcPoint(arcPoints, project, allProjects);
            // Should return book-2 arc because it's the most recent book before book-3
            expect(result?.bookId).toBe('book-2');
        });

        it('should parse various series index formats', () => {
            const project = createProject('book-3', 'series-1', 'Book 3');
            const allProjects = [
                createProject('book-1', 'series-1', 'Vol. 1'),
                createProject('book-2', 'series-1', '2'),
                createProject('book-3', 'series-1', 'Book 3'),
            ];
            const arcPoints = [
                createArcPoint('book-1', 1000),
                createArcPoint('book-2', 2000),
            ];

            const result = findMostRecentArcPoint(arcPoints, project, allProjects);
            expect(result?.bookId).toBe('book-2');
        });

        it('should fallback to timestamp when allProjects not provided', () => {
            const project = createProject('book-3', 'series-1', 'Book 3');
            const arcPoints = [
                createArcPoint('book-1', 1000),
                createArcPoint('book-2', 2000),
            ];

            const result = findMostRecentArcPoint(arcPoints, project);
            expect(result?.bookId).toBe('book-2'); // Falls back to timestamp
        });
    });
});
