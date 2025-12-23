/**
 * FocusModeToggle Component Specification Tests
 * 
 * SPECIFICATIONS:
 * 1. MUST show "Focus" when not in focus mode
 * 2. MUST show "Exit Focus" when in focus mode
 * 3. MUST be disabled when no scene is active (and not in focus mode)
 * 4. MUST toggle focus mode when clicked (if scene is active)
 * 5. MUST show appropriate icons for each mode
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FocusModeToggle } from '../FocusModeToggle';

// ============================================
// Mock Dependencies
// ============================================

const mockToggleFocusMode = vi.fn();
let mockFocusMode = false;

vi.mock('@/store/use-format-store', () => ({
    useFormatStore: () => ({
        focusMode: mockFocusMode,
        toggleFocusMode: mockToggleFocusMode,
    }),
}));

vi.mock('@/components/ui/button', () => ({
    Button: ({ children, onClick, disabled }: React.PropsWithChildren<{ onClick?: () => void; disabled?: boolean }>) => (
        <button onClick={onClick} disabled={disabled} data-testid="focus-button">{children}</button>
    ),
}));

vi.mock('@/components/ui/tooltip', () => ({
    TooltipProvider: ({ children }: React.PropsWithChildren) => <>{children}</>,
    Tooltip: ({ children }: React.PropsWithChildren) => <>{children}</>,
    TooltipContent: ({ children }: React.PropsWithChildren) => <div data-testid="tooltip-content">{children}</div>,
    TooltipTrigger: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

vi.mock('lucide-react', () => ({
    Maximize2: () => <span data-testid="maximize-icon">⤢</span>,
    Minimize2: () => <span data-testid="minimize-icon">⤡</span>,
}));

// ============================================
// Specification Tests
// ============================================

describe('FocusModeToggle Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockFocusMode = false;
    });

    // ========================================
    // SPECIFICATION: Button Text
    // ========================================

    describe('SPEC: Button Text', () => {
        it('MUST show "Focus" when not in focus mode', () => {
            mockFocusMode = false;

            render(<FocusModeToggle hasActiveScene={true} />);

            expect(screen.getByText('Focus')).toBeInTheDocument();
        });

        it('MUST show "Exit Focus" when in focus mode', () => {
            mockFocusMode = true;

            render(<FocusModeToggle hasActiveScene={true} />);

            expect(screen.getByText('Exit Focus')).toBeInTheDocument();
        });
    });

    // ========================================
    // SPECIFICATION: Icons
    // ========================================

    describe('SPEC: Icons', () => {
        it('MUST show maximize icon when not in focus mode', () => {
            mockFocusMode = false;

            render(<FocusModeToggle hasActiveScene={true} />);

            expect(screen.getByTestId('maximize-icon')).toBeInTheDocument();
        });

        it('MUST show minimize icon when in focus mode', () => {
            mockFocusMode = true;

            render(<FocusModeToggle hasActiveScene={true} />);

            expect(screen.getByTestId('minimize-icon')).toBeInTheDocument();
        });
    });

    // ========================================
    // SPECIFICATION: Disabled State
    // ========================================

    describe('SPEC: Disabled State', () => {
        it('MUST be disabled when no scene active and not in focus mode', () => {
            mockFocusMode = false;

            render(<FocusModeToggle hasActiveScene={false} />);

            expect(screen.getByTestId('focus-button')).toBeDisabled();
        });

        it('MUST be enabled when scene is active', () => {
            mockFocusMode = false;

            render(<FocusModeToggle hasActiveScene={true} />);

            expect(screen.getByTestId('focus-button')).not.toBeDisabled();
        });

        it('MUST be enabled in focus mode even without active scene (to allow exit)', () => {
            mockFocusMode = true;

            render(<FocusModeToggle hasActiveScene={false} />);

            expect(screen.getByTestId('focus-button')).not.toBeDisabled();
        });
    });

    // ========================================
    // SPECIFICATION: Click Behavior
    // ========================================

    describe('SPEC: Click Behavior', () => {
        it('MUST call toggleFocusMode when clicked with active scene', () => {
            mockFocusMode = false;

            render(<FocusModeToggle hasActiveScene={true} />);

            fireEvent.click(screen.getByTestId('focus-button'));

            expect(mockToggleFocusMode).toHaveBeenCalledTimes(1);
        });

        it('MUST NOT call toggleFocusMode when no active scene', () => {
            mockFocusMode = false;

            render(<FocusModeToggle hasActiveScene={false} />);

            fireEvent.click(screen.getByTestId('focus-button'));

            expect(mockToggleFocusMode).not.toHaveBeenCalled();
        });
    });

    // ========================================
    // SPECIFICATION: Tooltip Content
    // ========================================

    describe('SPEC: Tooltip', () => {
        it('MUST show instruction when no scene active', () => {
            mockFocusMode = false;

            render(<FocusModeToggle hasActiveScene={false} />);

            expect(screen.getByText('Select a scene to use Focus Mode')).toBeInTheDocument();
        });

        it('MUST show "Enter Focus Mode" tooltip when scene active', () => {
            mockFocusMode = false;

            render(<FocusModeToggle hasActiveScene={true} />);

            expect(screen.getByText('Enter Focus Mode')).toBeInTheDocument();
        });

        it('MUST show "Exit Focus Mode" tooltip when in focus mode', () => {
            mockFocusMode = true;

            render(<FocusModeToggle hasActiveScene={true} />);

            expect(screen.getByText('Exit Focus Mode')).toBeInTheDocument();
        });
    });
});
