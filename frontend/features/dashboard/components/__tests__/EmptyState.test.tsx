/**
 * EmptyState Component Specification Tests
 * 
 * SPECIFICATIONS:
 * 1. MUST display welcoming message for new users
 * 2. MUST include create project dialog
 * 3. MUST include restore project dialog
 * 4. MUST have visual indicators (icons, animations)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '../EmptyState';

// ============================================
// Mock Dependencies
// ============================================

vi.mock('lucide-react', () => ({
    BookOpen: () => <span data-testid="book-icon">📖</span>,
    Sparkles: () => <span data-testid="sparkles-icon">✨</span>,
}));

vi.mock('@/features/project', () => ({
    CreateProjectDialog: () => (
        <button data-testid="create-project-dialog">Create New Project</button>
    ),
}));

vi.mock('@/features/data-management', () => ({
    RestoreProjectDialog: () => (
        <button data-testid="restore-project-dialog">Restore Project</button>
    ),
}));

// ============================================
// Specification Tests
// ============================================

describe('EmptyState Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ========================================
    // SPECIFICATION: Welcome Message
    // ========================================

    describe('SPEC: Welcome Message', () => {
        it('MUST display welcome heading', () => {
            render(<EmptyState />);

            expect(screen.getByText('Welcome to your Writing Studio')).toBeInTheDocument();
        });

        it('MUST display instructional text', () => {
            render(<EmptyState />);

            expect(screen.getByText(/Your journey begins here/i)).toBeInTheDocument();
            expect(screen.getByText(/Create a new novel/i)).toBeInTheDocument();
        });
    });

    // ========================================
    // SPECIFICATION: Action Buttons
    // ========================================

    describe('SPEC: Action Buttons', () => {
        it('MUST include create project dialog', () => {
            render(<EmptyState />);

            expect(screen.getByTestId('create-project-dialog')).toBeInTheDocument();
        });

        it('MUST include restore project dialog', () => {
            render(<EmptyState />);

            expect(screen.getByTestId('restore-project-dialog')).toBeInTheDocument();
        });
    });

    // ========================================
    // SPECIFICATION: Visual Elements
    // ========================================

    describe('SPEC: Visual Elements', () => {
        it('MUST display book icon', () => {
            render(<EmptyState />);

            expect(screen.getByTestId('book-icon')).toBeInTheDocument();
        });

        it('MUST display sparkles icon', () => {
            render(<EmptyState />);

            expect(screen.getByTestId('sparkles-icon')).toBeInTheDocument();
        });
    });
});
