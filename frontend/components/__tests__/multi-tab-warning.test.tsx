/**
 * MultiTabWarning Component Specification Tests
 * 
 * SPECIFICATIONS:
 * 1. MUST show full-screen block for non-leader tabs
 * 2. MUST return null for leader tabs (no blocking)
 * 3. MUST show dismissible banner in banner mode
 * 4. MUST display tab count when provided
 * 5. MUST allow dismiss via callback
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MultiTabWarning } from '../multi-tab-warning';

// ============================================
// Mock Dependencies
// ============================================

const mockUseTabLeader = vi.fn();

vi.mock('@/hooks/use-tab-leader', () => ({
    useTabLeader: () => mockUseTabLeader(),
}));

vi.mock('@/components/ui/button', () => ({
    Button: ({ children, onClick, ...props }: React.PropsWithChildren<{ onClick?: () => void }>) => (
        <button onClick={onClick} data-testid="button" {...props}>{children}</button>
    ),
}));

vi.mock('lucide-react', () => ({
    AlertTriangle: () => <span data-testid="warning-icon">⚠️</span>,
    X: () => <span data-testid="close-icon">✕</span>,
}));

// ============================================
// Specification Tests
// ============================================

describe('MultiTabWarning Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ========================================
    // SPECIFICATION: Leader Tab Behavior
    // ========================================

    describe('SPEC: Leader Tab - No Blocking', () => {
        beforeEach(() => {
            mockUseTabLeader.mockReturnValue({
                isLeader: true,
                tabId: 'leader-tab-123',
            });
        });

        it('MUST return null when tab is the leader', () => {
            const { container } = render(<MultiTabWarning />);

            // Should render nothing
            expect(container).toBeEmptyDOMElement();
        });

        it('MUST NOT show blocking overlay when leader', () => {
            render(<MultiTabWarning />);

            expect(screen.queryByText('Another Tab is Active')).not.toBeInTheDocument();
        });
    });

    // ========================================
    // SPECIFICATION: Non-Leader Tab Blocking
    // ========================================

    describe('SPEC: Non-Leader Tab - Full Screen Block', () => {
        beforeEach(() => {
            mockUseTabLeader.mockReturnValue({
                isLeader: false,
                tabId: 'follower-tab-456',
            });
        });

        it('MUST show blocking overlay when not leader', () => {
            render(<MultiTabWarning />);

            expect(screen.getByText('Another Tab is Active')).toBeInTheDocument();
        });

        it('MUST display warning message about conflicts', () => {
            render(<MultiTabWarning />);

            expect(screen.getByText(/prevent data conflicts/i)).toBeInTheDocument();
        });

        it('MUST display tab ID for debugging', () => {
            render(<MultiTabWarning />);

            expect(screen.getByText(/Tab ID:/)).toBeInTheDocument();
            expect(screen.getByText(/follower-tab-456/)).toBeInTheDocument();
        });

        it('MUST show warning icon', () => {
            render(<MultiTabWarning />);

            expect(screen.getByTestId('warning-icon')).toBeInTheDocument();
        });

        it('MUST provide instructions for resolution', () => {
            render(<MultiTabWarning />);

            expect(screen.getByText(/Close this tab/i)).toBeInTheDocument();
            expect(screen.getByText(/Close the other tab/i)).toBeInTheDocument();
        });
    });

    // ========================================
    // SPECIFICATION: Banner Mode
    // ========================================

    describe('SPEC: Banner Mode - Dismissible Warning', () => {
        beforeEach(() => {
            mockUseTabLeader.mockReturnValue({
                isLeader: true,
                tabId: 'any-tab',
            });
        });

        it('MUST show dismissible banner when props provided', () => {
            const onDismiss = vi.fn();

            render(
                <MultiTabWarning
                    projectId="proj-1"
                    tabCount={3}
                    onDismiss={onDismiss}
                />
            );

            expect(screen.getByText(/3 tabs/i)).toBeInTheDocument();
            expect(screen.getByText(/Changes may conflict/i)).toBeInTheDocument();
        });

        it('MUST display tab count in banner', () => {
            render(
                <MultiTabWarning
                    projectId="proj-1"
                    tabCount={5}
                    onDismiss={() => { }}
                />
            );

            expect(screen.getByText(/5 tabs/i)).toBeInTheDocument();
        });

        it('MUST call onDismiss when close button clicked', () => {
            const onDismiss = vi.fn();

            render(
                <MultiTabWarning
                    projectId="proj-1"
                    tabCount={2}
                    onDismiss={onDismiss}
                />
            );

            // Find and click the dismiss button
            const buttons = screen.getAllByTestId('button');
            fireEvent.click(buttons[0]);

            expect(onDismiss).toHaveBeenCalledTimes(1);
        });

        it('MUST show close icon in banner', () => {
            render(
                <MultiTabWarning
                    projectId="proj-1"
                    tabCount={2}
                    onDismiss={() => { }}
                />
            );

            expect(screen.getByTestId('close-icon')).toBeInTheDocument();
        });
    });
});
