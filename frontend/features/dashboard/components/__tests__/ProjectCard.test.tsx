/**
 * ProjectCard Component Specification Tests
 * 
 * SPECIFICATIONS:
 * 1. MUST display project title and author
 * 2. MUST show "Archived" badge for archived projects
 * 3. MUST link to project page with correct ID
 * 4. MUST show cover image when available
 * 5. MUST call onDelete when delete option is clicked
 * 6. MUST display formatted update date
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProjectCard } from '../ProjectCard';
import type { Project } from '@/domain/entities/types';

// ============================================
// Mock Dependencies
// ============================================

vi.mock('next/link', () => ({
    default: ({ children, href }: { children: React.ReactNode; href: string }) => (
        <a href={href} data-testid="project-link">{children}</a>
    ),
}));

vi.mock('@/components/ui/card', () => ({
    Card: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => (
        <div data-testid="card" className={className}>{children}</div>
    ),
    CardContent: ({ children }: React.PropsWithChildren) => (
        <div data-testid="card-content">{children}</div>
    ),
    CardFooter: ({ children }: React.PropsWithChildren) => (
        <div data-testid="card-footer">{children}</div>
    ),
}));

vi.mock('@/components/ui/button', () => ({
    Button: ({ children, onClick, ...props }: React.PropsWithChildren<{ onClick?: (e: React.MouseEvent) => void }>) => (
        <button onClick={onClick} data-testid="button" {...props}>{children}</button>
    ),
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
    DropdownMenu: ({ children }: React.PropsWithChildren) => <div data-testid="dropdown-menu">{children}</div>,
    DropdownMenuContent: ({ children }: React.PropsWithChildren) => <div data-testid="dropdown-content">{children}</div>,
    DropdownMenuItem: ({ children, onClick }: React.PropsWithChildren<{ onClick?: (e: React.MouseEvent) => void }>) => (
        <button data-testid="dropdown-item" onClick={onClick}>{children}</button>
    ),
    DropdownMenuTrigger: ({ children }: React.PropsWithChildren) => <div data-testid="dropdown-trigger">{children}</div>,
    DropdownMenuSeparator: () => <hr data-testid="dropdown-separator" />,
}));

vi.mock('@/features/data-management', () => ({
    ExportProjectButton: ({ projectId }: { projectId: string }) => (
        <button data-testid="export-button">Export {projectId}</button>
    ),
}));

vi.mock('lucide-react', () => ({
    MoreVertical: () => <span data-testid="more-icon">⋮</span>,
    Trash2: () => <span data-testid="trash-icon">🗑</span>,
    BookOpen: () => <span data-testid="book-icon">📖</span>,
    Clock: () => <span data-testid="clock-icon">🕐</span>,
    Globe: () => <span data-testid="globe-icon">🌐</span>,
    User: () => <span data-testid="user-icon">👤</span>,
}));

// ============================================
// Test Fixtures
// ============================================

const createMockProject = (overrides: Partial<Project> = {}): Project => ({
    id: 'proj-123',
    title: 'My Great Novel',
    description: 'A story about adventures',
    author: 'Jane Author',
    language: 'EN',
    coverImage: null,
    archived: false,
    createdAt: Date.now() - 86400000, // 1 day ago
    updatedAt: Date.now(),
    seriesId: null,
    seriesIndex: null,
    ...overrides,
} as Project);

// ============================================
// Specification Tests
// ============================================

describe('ProjectCard Component', () => {
    let mockOnDelete: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.clearAllMocks();
        mockOnDelete = vi.fn();
    });

    // ========================================
    // SPECIFICATION: Basic Display
    // ========================================

    describe('SPEC: Basic Display', () => {
        it('MUST display project title', () => {
            render(
                <ProjectCard
                    project={createMockProject({ title: 'My Amazing Story' })}
                    onDelete={mockOnDelete}
                />
            );

            expect(screen.getByText('My Amazing Story')).toBeInTheDocument();
        });

        it('MUST display project author', () => {
            render(
                <ProjectCard
                    project={createMockProject({ author: 'John Smith' })}
                    onDelete={mockOnDelete}
                />
            );

            expect(screen.getByText('John Smith')).toBeInTheDocument();
        });

        it('MUST show "Unknown Author" when author is missing', () => {
            render(
                <ProjectCard
                    project={createMockProject({ author: '' })}
                    onDelete={mockOnDelete}
                />
            );

            expect(screen.getByText('Unknown Author')).toBeInTheDocument();
        });

        it('MUST display language code', () => {
            render(
                <ProjectCard
                    project={createMockProject({ language: 'FR' })}
                    onDelete={mockOnDelete}
                />
            );

            expect(screen.getByText('FR')).toBeInTheDocument();
        });
    });

    // ========================================
    // SPECIFICATION: Navigation
    // ========================================

    describe('SPEC: Navigation', () => {
        it('MUST link to correct project page', () => {
            render(
                <ProjectCard
                    project={createMockProject({ id: 'proj-456' })}
                    onDelete={mockOnDelete}
                />
            );

            const link = screen.getByTestId('project-link');
            expect(link).toHaveAttribute('href', '/project?id=proj-456');
        });
    });

    // ========================================
    // SPECIFICATION: Archived Badge
    // ========================================

    describe('SPEC: Archived Badge', () => {
        it('MUST show "Archived" badge for archived projects', () => {
            render(
                <ProjectCard
                    project={createMockProject({ archived: true })}
                    onDelete={mockOnDelete}
                />
            );

            expect(screen.getByText('Archived')).toBeInTheDocument();
        });

        it('MUST NOT show "Archived" badge for active projects', () => {
            render(
                <ProjectCard
                    project={createMockProject({ archived: false })}
                    onDelete={mockOnDelete}
                />
            );

            expect(screen.queryByText('Archived')).not.toBeInTheDocument();
        });
    });

    // ========================================
    // SPECIFICATION: Cover Image
    // ========================================

    describe('SPEC: Cover Image', () => {
        it('MUST display cover image when available', () => {
            render(
                <ProjectCard
                    project={createMockProject({ coverImage: 'https://example.com/cover.jpg' })}
                    onDelete={mockOnDelete}
                />
            );

            const img = screen.getByAltText('My Great Novel');
            expect(img).toBeInTheDocument();
            expect(img).toHaveAttribute('src', 'https://example.com/cover.jpg');
        });

        it('MUST show book icon when no cover image', () => {
            render(
                <ProjectCard
                    project={createMockProject({ coverImage: null })}
                    onDelete={mockOnDelete}
                />
            );

            expect(screen.getByTestId('book-icon')).toBeInTheDocument();
        });
    });

    // ========================================
    // SPECIFICATION: Series Display
    // ========================================

    describe('SPEC: Series Display', () => {
        it('MUST show "Book X" when part of series', () => {
            render(
                <ProjectCard
                    project={createMockProject({ seriesIndex: 3 })}
                    onDelete={mockOnDelete}
                />
            );

            expect(screen.getByText('Book 3')).toBeInTheDocument();
        });

        it('MUST show "Novel" when not part of series', () => {
            render(
                <ProjectCard
                    project={createMockProject({ seriesIndex: null })}
                    onDelete={mockOnDelete}
                />
            );

            expect(screen.getByText('Novel')).toBeInTheDocument();
        });
    });

    // ========================================
    // SPECIFICATION: Delete Action
    // ========================================

    describe('SPEC: Delete Action', () => {
        it('MUST include export button in dropdown', () => {
            render(
                <ProjectCard
                    project={createMockProject({ id: 'proj-export' })}
                    onDelete={mockOnDelete}
                />
            );

            expect(screen.getByTestId('export-button')).toBeInTheDocument();
        });

        it('MUST call onDelete when delete option is clicked', () => {
            render(
                <ProjectCard
                    project={createMockProject()}
                    onDelete={mockOnDelete}
                />
            );

            // Open dropdown
            fireEvent.click(screen.getByTestId('more-icon'));

            // Click delete option
            fireEvent.click(screen.getByText('Delete Project'));

            expect(mockOnDelete).toHaveBeenCalled();
        });
    });
});

