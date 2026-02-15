/**
 * SeriesCard Component Specification Tests
 * 
 * SPECIFICATIONS:
 * 1. MUST display series title
 * 2. MUST show book count (with correct singular/plural)
 * 3. MUST display genre badge if set
 * 4. MUST display status badge
 * 5. MUST list projects in the series
 * 6. MUST show "No books yet" for empty series
 * 7. MUST have edit and delete actions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { SeriesCard } from '../SeriesCard';
import type { Series, Project } from '@/domain/entities/types';

// ============================================
// Mock Dependencies
// ============================================

vi.mock('@/hooks/use-series-repository', () => ({
    useSeriesRepository: () => ({
        delete: vi.fn(),
    }),
}));

vi.mock('@/hooks/use-live-query', () => ({
    invalidateQueries: vi.fn(),
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: vi.fn(),
    }),
}));

vi.mock('@/components/ui/card', () => ({
    Card: ({ children }: React.PropsWithChildren) => <div data-testid="card">{children}</div>,
    CardContent: ({ children }: React.PropsWithChildren) => <div data-testid="card-content">{children}</div>,
    CardDescription: ({ children }: React.PropsWithChildren) => <p data-testid="card-description">{children}</p>,
    CardHeader: ({ children }: React.PropsWithChildren) => <div data-testid="card-header">{children}</div>,
    CardTitle: ({ children }: React.PropsWithChildren) => <h3 data-testid="card-title">{children}</h3>,
}));

vi.mock('@/components/ui/button', () => ({
    Button: ({ children }: React.PropsWithChildren) => <button>{children}</button>,
}));

vi.mock('@/components/ui/badge', () => ({
    Badge: ({ children }: React.PropsWithChildren) => <span data-testid="badge">{children}</span>,
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
    DropdownMenu: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
    DropdownMenuContent: ({ children }: React.PropsWithChildren) => <div data-testid="dropdown-content">{children}</div>,
    DropdownMenuItem: ({ children, onClick }: React.PropsWithChildren<{ onClick?: () => void }>) => (
        <button data-testid="menu-item" onClick={onClick}>{children}</button>
    ),
    DropdownMenuSeparator: () => <hr />,
    DropdownMenuTrigger: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
}));

vi.mock('@/components/ui/alert-dialog', () => ({
    AlertDialog: ({ children, open }: React.PropsWithChildren<{ open: boolean }>) => (
        open ? <div data-testid="alert-dialog">{children}</div> : null
    ),
    AlertDialogAction: ({ children }: React.PropsWithChildren) => <button>{children}</button>,
    AlertDialogCancel: ({ children }: React.PropsWithChildren) => <button>{children}</button>,
    AlertDialogContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
    AlertDialogDescription: ({ children }: React.PropsWithChildren) => <p>{children}</p>,
    AlertDialogFooter: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
    AlertDialogHeader: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
    AlertDialogTitle: ({ children }: React.PropsWithChildren) => <h4>{children}</h4>,
}));

vi.mock('lucide-react', () => ({
    MoreHorizontal: () => <span>⋯</span>,
    Pencil: () => <span>✏️</span>,
    Trash2: () => <span>🗑</span>,
    BookOpen: () => <span data-testid="book-icon">📖</span>,
    X: () => <span>✕</span>,
    XIcon: () => <span>✕</span>,
}));

vi.mock('sonner', () => ({
    toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('./EditSeriesDialog', () => ({
    EditSeriesDialog: () => <div data-testid="edit-dialog" />,
}));

// ============================================
// Test Fixtures
// ============================================

const createMockSeries = (overrides: Partial<Series> = {}): Series => ({
    id: 'series-1',
    title: 'My Series',
    description: 'A book series',
    genre: 'Fantasy',
    status: 'in-progress',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
} as Series);

const createMockProject = (overrides: Partial<Project> = {}): Project => ({
    id: 'proj-1',
    title: 'Book One',
    description: '',
    author: '',
    language: 'EN',
    coverImage: null,
    archived: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    seriesId: 'series-1',
    seriesIndex: 'Book 1',
    ...overrides,
} as Project);

// ============================================
// Specification Tests
// ============================================

describe('SeriesCard Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ========================================
    // SPECIFICATION: Basic Display
    // ========================================

    describe('SPEC: Basic Display', () => {
        it('MUST display series title', () => {
            render(<SeriesCard series={createMockSeries({ title: 'Epic Adventures' })} projects={[]} />);

            expect(screen.getByText('Epic Adventures')).toBeInTheDocument();
        });

        it('MUST show genre badge when set', () => {
            render(<SeriesCard series={createMockSeries({ genre: 'Sci-Fi' })} projects={[]} />);

            expect(screen.getByText('Sci-Fi')).toBeInTheDocument();
        });
    });

    // ========================================
    // SPECIFICATION: Book Count
    // ========================================

    describe('SPEC: Book Count', () => {
        it('MUST show "No books yet" for empty series', () => {
            render(<SeriesCard series={createMockSeries()} projects={[]} />);

            expect(screen.getByText('No books yet')).toBeInTheDocument();
        });

        it('MUST show "1 book" for single book', () => {
            render(<SeriesCard series={createMockSeries()} projects={[createMockProject()]} />);

            expect(screen.getByText('1 book')).toBeInTheDocument();
        });

        it('MUST show "X books" for multiple books', () => {
            render(
                <SeriesCard
                    series={createMockSeries()}
                    projects={[
                        createMockProject({ id: 'p1' }),
                        createMockProject({ id: 'p2' }),
                        createMockProject({ id: 'p3' }),
                    ]}
                />
            );

            expect(screen.getByText('3 books')).toBeInTheDocument();
        });
    });

    // ========================================
    // SPECIFICATION: Status Display
    // ========================================

    describe('SPEC: Status Display', () => {
        it('MUST show "In Progress" for in-progress status', () => {
            render(<SeriesCard series={createMockSeries({ status: 'in-progress' })} projects={[]} />);

            expect(screen.getByText('In Progress')).toBeInTheDocument();
        });

        it('MUST show "Completed" for completed status', () => {
            render(<SeriesCard series={createMockSeries({ status: 'completed' })} projects={[]} />);

            expect(screen.getByText('Completed')).toBeInTheDocument();
        });

        it('MUST show "Planned" for planned status', () => {
            render(<SeriesCard series={createMockSeries({ status: 'planned' })} projects={[]} />);

            expect(screen.getByText('Planned')).toBeInTheDocument();
        });
    });

    // ========================================
    // SPECIFICATION: Project List
    // ========================================

    describe('SPEC: Project List', () => {
        it('MUST list project titles', () => {
            render(
                <SeriesCard
                    series={createMockSeries()}
                    projects={[
                        createMockProject({ title: 'The Beginning' }),
                        createMockProject({ id: 'p2', title: 'The Middle' }),
                    ]}
                />
            );

            expect(screen.getByText('The Beginning')).toBeInTheDocument();
            expect(screen.getByText('The Middle')).toBeInTheDocument();
        });

        it('MUST show book icons for projects', () => {
            render(
                <SeriesCard
                    series={createMockSeries()}
                    projects={[createMockProject()]}
                />
            );

            expect(screen.getByTestId('book-icon')).toBeInTheDocument();
        });

        it('MUST show helpful message for empty series', () => {
            render(<SeriesCard series={createMockSeries()} projects={[]} />);

            expect(screen.getByText(/Create a project and add it to this series/i)).toBeInTheDocument();
        });
    });

    // ========================================
    // SPECIFICATION: Action Menu
    // ========================================

    describe('SPEC: Action Menu', () => {
        it('MUST include Edit option', () => {
            render(<SeriesCard series={createMockSeries()} projects={[]} />);

            expect(screen.getByText('Edit Details')).toBeInTheDocument();
        });

        it('MUST include Delete option', () => {
            render(<SeriesCard series={createMockSeries()} projects={[]} />);

            expect(screen.getByText('Delete')).toBeInTheDocument();
        });
    });
});
