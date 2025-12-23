/**
 * SnippetList Component Specification Tests
 * 
 * SPECIFICATIONS:
 * 1. MUST display list of snippets
 * 2. MUST allow searching/filtering snippets
 * 3. MUST have "New Snippet" button
 * 4. MUST show "No snippets found" when empty
 * 5. MUST call onSelect when snippet is clicked
 * 6. MUST have delete action for each snippet
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SnippetList } from '../snippet-list';

// ============================================
// Mock Dependencies
// ============================================

const mockSnippetRepo = {
    getByProject: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
};

vi.mock('@/hooks/use-snippet-repository', () => ({
    useSnippetRepository: () => mockSnippetRepo,
}));

vi.mock('@/hooks/use-live-query', () => ({
    useLiveQuery: (queryFn: () => unknown) => queryFn(),
    invalidateQueries: vi.fn(),
}));

vi.mock('@/hooks/use-confirmation', () => ({
    useConfirmation: () => ({
        confirm: vi.fn().mockResolvedValue(true),
        ConfirmationDialog: () => <div data-testid="confirmation-dialog" />,
    }),
}));

vi.mock('@/shared/utils/toast-service', () => ({
    toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/components/ui/button', () => ({
    Button: ({ children, onClick }: React.PropsWithChildren<{ onClick?: () => void }>) => (
        <button onClick={onClick} data-testid="button">{children}</button>
    ),
}));

vi.mock('@/components/ui/input', () => ({
    Input: ({ value, onChange, placeholder }: { value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder: string }) => (
        <input
            data-testid="search-input"
            value={value}
            onChange={onChange}
            placeholder={placeholder}
        />
    ),
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
    DropdownMenu: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
    DropdownMenuContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
    DropdownMenuItem: ({ children, onClick }: React.PropsWithChildren<{ onClick?: (e: React.MouseEvent) => void }>) => (
        <button data-testid="menu-item" onClick={onClick}>{children}</button>
    ),
    DropdownMenuTrigger: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
}));

vi.mock('lucide-react', () => ({
    Plus: () => <span data-testid="plus-icon">+</span>,
    Search: () => <span data-testid="search-icon">🔍</span>,
    FileText: () => <span data-testid="file-icon">📄</span>,
    Pin: () => <span>📌</span>,
    Trash2: () => <span data-testid="trash-icon">🗑</span>,
    MoreVertical: () => <span>⋮</span>,
}));

vi.mock('uuid', () => ({
    v4: () => 'mock-uuid',
}));

// ============================================
// Test Fixtures
// ============================================

const createMockSnippet = (overrides = {}) => ({
    id: 'snippet-1',
    projectId: 'proj-1',
    title: 'Test Snippet',
    content: null,
    pinned: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
});

// ============================================
// Specification Tests
// ============================================

describe('SnippetList Component', () => {
    const mockOnSelect = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        mockSnippetRepo.getByProject.mockReturnValue([]);
    });

    // ========================================
    // SPECIFICATION: Basic Display
    // ========================================

    describe('SPEC: Basic Display', () => {
        it('MUST show search input', () => {
            render(<SnippetList projectId="proj-1" onSelect={mockOnSelect} />);

            expect(screen.getByTestId('search-input')).toBeInTheDocument();
        });

        it('MUST show "New Snippet" button', () => {
            render(<SnippetList projectId="proj-1" onSelect={mockOnSelect} />);

            expect(screen.getByText('New Snippet')).toBeInTheDocument();
        });

        it('MUST show search icon', () => {
            render(<SnippetList projectId="proj-1" onSelect={mockOnSelect} />);

            expect(screen.getByTestId('search-icon')).toBeInTheDocument();
        });
    });

    // ========================================
    // SPECIFICATION: Empty State
    // ========================================

    describe('SPEC: Empty State', () => {
        it('MUST show "No snippets found" when empty', () => {
            mockSnippetRepo.getByProject.mockReturnValue([]);

            render(<SnippetList projectId="proj-1" onSelect={mockOnSelect} />);

            expect(screen.getByText('No snippets found.')).toBeInTheDocument();
        });
    });

    // ========================================
    // SPECIFICATION: Snippet List
    // ========================================

    describe('SPEC: Snippet List', () => {
        it('MUST display snippet titles', () => {
            mockSnippetRepo.getByProject.mockReturnValue([
                createMockSnippet({ id: 's1', title: 'Character Notes' }),
                createMockSnippet({ id: 's2', title: 'Plot Outline' }),
            ]);

            render(<SnippetList projectId="proj-1" onSelect={mockOnSelect} />);

            expect(screen.getByText('Character Notes')).toBeInTheDocument();
            expect(screen.getByText('Plot Outline')).toBeInTheDocument();
        });

        it('MUST show file icon for each snippet', () => {
            mockSnippetRepo.getByProject.mockReturnValue([
                createMockSnippet(),
            ]);

            render(<SnippetList projectId="proj-1" onSelect={mockOnSelect} />);

            expect(screen.getByTestId('file-icon')).toBeInTheDocument();
        });
    });

    // ========================================
    // SPECIFICATION: Search/Filter
    // ========================================

    describe('SPEC: Search Filter', () => {
        it('MUST filter snippets by title', () => {
            mockSnippetRepo.getByProject.mockReturnValue([
                createMockSnippet({ id: 's1', title: 'Character Notes' }),
                createMockSnippet({ id: 's2', title: 'Plot Outline' }),
            ]);

            render(<SnippetList projectId="proj-1" onSelect={mockOnSelect} />);

            // Type in search
            fireEvent.change(screen.getByTestId('search-input'), {
                target: { value: 'character' },
            });

            expect(screen.getByText('Character Notes')).toBeInTheDocument();
            expect(screen.queryByText('Plot Outline')).not.toBeInTheDocument();
        });

        it('MUST be case-insensitive', () => {
            mockSnippetRepo.getByProject.mockReturnValue([
                createMockSnippet({ id: 's1', title: 'Important Notes' }),
            ]);

            render(<SnippetList projectId="proj-1" onSelect={mockOnSelect} />);

            fireEvent.change(screen.getByTestId('search-input'), {
                target: { value: 'IMPORTANT' },
            });

            expect(screen.getByText('Important Notes')).toBeInTheDocument();
        });
    });

    // ========================================
    // SPECIFICATION: Selection
    // ========================================

    describe('SPEC: Selection', () => {
        it('MUST include confirmation dialog', () => {
            render(<SnippetList projectId="proj-1" onSelect={mockOnSelect} />);

            expect(screen.getByTestId('confirmation-dialog')).toBeInTheDocument();
        });
    });

    // ========================================
    // SPECIFICATION: Actions
    // ========================================

    describe('SPEC: Actions', () => {
        it('MUST include Delete option for snippets', () => {
            mockSnippetRepo.getByProject.mockReturnValue([
                createMockSnippet(),
            ]);

            render(<SnippetList projectId="proj-1" onSelect={mockOnSelect} />);

            expect(screen.getByText('Delete')).toBeInTheDocument();
        });
    });
});
