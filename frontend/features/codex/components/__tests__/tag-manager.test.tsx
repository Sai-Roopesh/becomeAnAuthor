/**
 * TagManager Component Specification Tests
 * 
 * SPECIFICATIONS:
 * 1. MUST display current tags attached to entry
 * 2. MUST allow creating new tags with random color
 * 3. MUST allow adding existing tags to entry
 * 4. MUST allow removing tags from entry
 * 5. MUST show "No tags yet" when entry has no tags
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { TagManager } from '../tag-manager';

// ============================================
// Mock Dependencies
// ============================================

const mockTagRepo = {
    getByProject: vi.fn(),
    getTagsByEntry: vi.fn(),
    create: vi.fn(),
    addTagToEntry: vi.fn(),
    removeTagFromEntry: vi.fn(),
};

vi.mock('@/hooks/use-codex-tag-repository', () => ({
    useCodexTagRepository: () => mockTagRepo,
}));

vi.mock('@/hooks/use-live-query', () => ({
    useLiveQuery: (queryFn: () => unknown) => queryFn(),
    invalidateQueries: vi.fn(),
}));

vi.mock('@/shared/utils/toast-service', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

vi.mock('@/components/ui/button', () => ({
    Button: ({ children, onClick, disabled }: React.PropsWithChildren<{ onClick?: () => void; disabled?: boolean }>) => (
        <button onClick={onClick} disabled={disabled} data-testid="button">{children}</button>
    ),
}));

vi.mock('@/components/ui/input', () => ({
    Input: ({ value, onChange, placeholder, disabled }: { value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder: string; disabled?: boolean }) => (
        <input
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            data-testid="tag-input"
        />
    ),
}));

vi.mock('@/components/ui/badge', () => ({
    Badge: ({ children, onClick }: React.PropsWithChildren<{ onClick?: () => void }>) => (
        <span onClick={onClick} data-testid="badge">{children}</span>
    ),
}));

vi.mock('lucide-react', () => ({
    Plus: () => <span data-testid="plus-icon">+</span>,
    X: ({ onClick }: { onClick?: (e: React.MouseEvent) => void }) => (
        <span data-testid="remove-icon" onClick={onClick}>×</span>
    ),
}));



// ============================================
// Test Fixtures
// ============================================

const createMockTag = (overrides = {}) => ({
    id: 'tag-1',
    projectId: 'proj-1',
    name: 'Important',
    color: '#ef4444',
    ...overrides,
});

// ============================================
// Specification Tests
// ============================================

describe('TagManager Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockTagRepo.getByProject.mockReturnValue([]);
        mockTagRepo.getTagsByEntry.mockReturnValue([]);
    });

    // ========================================
    // SPECIFICATION: Display Current Tags
    // ========================================

    describe('SPEC: Display Current Tags', () => {
        it('MUST display tags attached to entry', () => {
            mockTagRepo.getTagsByEntry.mockReturnValue([
                createMockTag({ id: 'tag-1', name: 'Action' }),
                createMockTag({ id: 'tag-2', name: 'Thriller' }),
            ]);

            render(<TagManager entryId="entry-1" seriesId="series-1" />);

            expect(screen.getByText('Action')).toBeInTheDocument();
            expect(screen.getByText('Thriller')).toBeInTheDocument();
        });

        it('MUST show "No tags yet" when entry has no tags', () => {
            mockTagRepo.getTagsByEntry.mockReturnValue([]);

            render(<TagManager entryId="entry-1" seriesId="series-1" />);

            expect(screen.getByText('No tags yet')).toBeInTheDocument();
        });

        it('MUST show remove button on each tag', () => {
            mockTagRepo.getTagsByEntry.mockReturnValue([
                createMockTag({ id: 'tag-1', name: 'Removable' }),
            ]);

            render(<TagManager entryId="entry-1" seriesId="series-1" />);

            expect(screen.getByTestId('remove-icon')).toBeInTheDocument();
        });
    });

    // ========================================
    // SPECIFICATION: Create New Tags
    // ========================================

    describe('SPEC: Create New Tags', () => {
        it('MUST show input for new tag name', () => {
            render(<TagManager entryId="entry-1" seriesId="series-1" />);

            expect(screen.getByTestId('tag-input')).toBeInTheDocument();
        });

        it('MUST show add button', () => {
            render(<TagManager entryId="entry-1" seriesId="series-1" />);

            expect(screen.getByTestId('plus-icon')).toBeInTheDocument();
        });
    });

    // ========================================
    // SPECIFICATION: Available Tags
    // ========================================

    describe('SPEC: Available Tags', () => {
        it('MUST show available tags not yet attached', () => {
            mockTagRepo.getByProject.mockReturnValue([
                createMockTag({ id: 'tag-1', name: 'Available' }),
            ]);
            mockTagRepo.getTagsByEntry.mockReturnValue([]);

            render(<TagManager entryId="entry-1" seriesId="series-1" />);

            // Should show "Or add existing tag:" section
            expect(screen.getByText('Or add existing tag:')).toBeInTheDocument();
            expect(screen.getByText('Available')).toBeInTheDocument();
        });

        it('MUST NOT show tags already attached', () => {
            const attachedTag = createMockTag({ id: 'tag-1', name: 'Attached' });
            mockTagRepo.getByProject.mockReturnValue([attachedTag]);
            mockTagRepo.getTagsByEntry.mockReturnValue([attachedTag]);

            render(<TagManager entryId="entry-1" seriesId="series-1" />);

            // "Or add existing tag:" should not appear when all tags are attached
            expect(screen.queryByText('Or add existing tag:')).not.toBeInTheDocument();
        });
    });

    // ========================================
    // SPECIFICATION: Section Headers
    // ========================================

    describe('SPEC: Section Headers', () => {
        it('MUST show "Tags" section header', () => {
            render(<TagManager entryId="entry-1" seriesId="series-1" />);

            expect(screen.getByText('Tags')).toBeInTheDocument();
        });

        it('MUST show "Add New Tag" section header', () => {
            render(<TagManager entryId="entry-1" seriesId="series-1" />);

            expect(screen.getByText('Add New Tag')).toBeInTheDocument();
        });
    });
});
