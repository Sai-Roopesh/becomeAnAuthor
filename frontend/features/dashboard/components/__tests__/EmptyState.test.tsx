/**
 * EmptyState Component Specification Tests
 *
 * SPECIFICATIONS:
 * 1. MUST display welcoming message for new users
 * 2. MUST display series-first instructional copy
 * 3. MUST have visual indicators (icons, animations)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '../EmptyState';

// ============================================
// Mock Dependencies
// ============================================

vi.mock('lucide-react', () => ({
    BookOpen: () => <span data-testid="book-icon">📖</span>,
    Sparkles: () => <span data-testid="sparkles-icon">✨</span>,
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
            expect(screen.getByText(/Create your first series/i)).toBeInTheDocument();
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
