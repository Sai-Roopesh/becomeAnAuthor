/**
 * ChatHeader Component Specification Tests
 * 
 * SPECIFICATIONS:
 * 1. MUST display thread name
 * 2. MUST allow inline editing of name
 * 3. MUST show pin/unpin option based on state
 * 4. MUST have archive, export, and delete actions
 * 5. MUST call appropriate callbacks on action
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatHeader } from '../chat-header';

// ============================================
// Mock Dependencies
// ============================================

vi.mock('@/components/ui/button', () => ({
    Button: ({ children, onClick }: React.PropsWithChildren<{ onClick?: () => void }>) => (
        <button onClick={onClick} data-testid="button">{children}</button>
    ),
}));

vi.mock('@/components/ui/input', () => ({
    Input: ({ value, onChange, onBlur, onKeyDown, autoFocus }: {
        value: string;
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
        onBlur: () => void;
        onKeyDown: (e: React.KeyboardEvent) => void;
        autoFocus?: boolean;
    }) => (
        <input
            data-testid="name-input"
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
            autoFocus={autoFocus}
        />
    ),
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
    DropdownMenu: ({ children }: React.PropsWithChildren) => <div data-testid="dropdown">{children}</div>,
    DropdownMenuContent: ({ children }: React.PropsWithChildren) => <div data-testid="dropdown-content">{children}</div>,
    DropdownMenuItem: ({ children, onClick }: React.PropsWithChildren<{ onClick?: () => void }>) => (
        <button data-testid="menu-item" onClick={onClick}>{children}</button>
    ),
    DropdownMenuTrigger: ({ children }: React.PropsWithChildren) => <div data-testid="dropdown-trigger">{children}</div>,
}));

vi.mock('lucide-react', () => ({
    MoreVertical: () => <span data-testid="more-icon">⋮</span>,
    Pin: () => <span data-testid="pin-icon">📌</span>,
    Archive: () => <span data-testid="archive-icon">📦</span>,
    Download: () => <span data-testid="download-icon">⬇️</span>,
    Trash2: () => <span data-testid="trash-icon">🗑</span>,
    Settings: () => <span data-testid="settings-icon">⚙️</span>,
    MessageSquare: () => <span data-testid="message-icon">💬</span>,
}));

vi.mock('@/lib/utils', () => ({
    cn: (...args: (string | boolean | undefined)[]) => args.filter(Boolean).join(' '),
}));

// ============================================
// Test Fixtures
// ============================================

const defaultProps = {
    threadName: 'Test Chat',
    isPinned: false,
    onNameChange: vi.fn(),
    onPin: vi.fn(),
    onArchive: vi.fn(),
    onExport: vi.fn(),
    onDelete: vi.fn(),
    onOpenSettings: vi.fn(),
};

// ============================================
// Specification Tests
// ============================================

describe('ChatHeader Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ========================================
    // SPECIFICATION: Basic Display
    // ========================================

    describe('SPEC: Basic Display', () => {
        it('MUST display thread name', () => {
            render(<ChatHeader {...defaultProps} threadName="My Conversation" />);

            expect(screen.getByText('My Conversation')).toBeInTheDocument();
        });

        it('MUST show message icon', () => {
            render(<ChatHeader {...defaultProps} />);

            expect(screen.getByTestId('message-icon')).toBeInTheDocument();
        });

        it('MUST show more options button', () => {
            render(<ChatHeader {...defaultProps} />);

            expect(screen.getByTestId('more-icon')).toBeInTheDocument();
        });
    });

    // ========================================
    // SPECIFICATION: Inline Editing
    // ========================================

    describe('SPEC: Inline Name Editing', () => {
        it('MUST show input when name is clicked', () => {
            render(<ChatHeader {...defaultProps} />);

            // Click on the thread name
            fireEvent.click(screen.getByText('Test Chat'));

            expect(screen.getByTestId('name-input')).toBeInTheDocument();
        });

        it('MUST call onNameChange when saving name', () => {
            const onNameChange = vi.fn();
            render(<ChatHeader {...defaultProps} onNameChange={onNameChange} />);

            // Click to edit
            fireEvent.click(screen.getByText('Test Chat'));

            // Change value
            fireEvent.change(screen.getByTestId('name-input'), {
                target: { value: 'New Name' },
            });

            // Blur to save
            fireEvent.blur(screen.getByTestId('name-input'));

            expect(onNameChange).toHaveBeenCalledWith('New Name');
        });

        it('MUST save on Enter key', () => {
            const onNameChange = vi.fn();
            render(<ChatHeader {...defaultProps} onNameChange={onNameChange} />);

            fireEvent.click(screen.getByText('Test Chat'));
            fireEvent.change(screen.getByTestId('name-input'), {
                target: { value: 'Enter Saved' },
            });
            fireEvent.keyDown(screen.getByTestId('name-input'), { key: 'Enter' });

            expect(onNameChange).toHaveBeenCalledWith('Enter Saved');
        });
    });

    // ========================================
    // SPECIFICATION: Pin State
    // ========================================

    describe('SPEC: Pin State', () => {
        it('MUST show "Pin Chat" when not pinned', () => {
            render(<ChatHeader {...defaultProps} isPinned={false} />);

            expect(screen.getByText('Pin Chat')).toBeInTheDocument();
        });

        it('MUST show "Unpin Chat" when pinned', () => {
            render(<ChatHeader {...defaultProps} isPinned={true} />);

            expect(screen.getByText('Unpin Chat')).toBeInTheDocument();
        });
    });

    // ========================================
    // SPECIFICATION: Action Menu Items
    // ========================================

    describe('SPEC: Action Menu', () => {
        it('MUST include Archive option', () => {
            render(<ChatHeader {...defaultProps} />);

            expect(screen.getByText('Archive Chat')).toBeInTheDocument();
        });

        it('MUST include Export option', () => {
            render(<ChatHeader {...defaultProps} />);

            expect(screen.getByText('Export to Markdown')).toBeInTheDocument();
        });

        it('MUST include Settings option', () => {
            render(<ChatHeader {...defaultProps} />);

            expect(screen.getByText('Chat Settings')).toBeInTheDocument();
        });

        it('MUST include Delete option', () => {
            render(<ChatHeader {...defaultProps} />);

            expect(screen.getByText('Delete Chat')).toBeInTheDocument();
        });
    });

    // ========================================
    // SPECIFICATION: Callbacks
    // ========================================

    describe('SPEC: Callbacks', () => {
        it('MUST call onPin when Pin clicked', () => {
            const onPin = vi.fn();
            render(<ChatHeader {...defaultProps} onPin={onPin} />);

            fireEvent.click(screen.getByText('Pin Chat'));

            expect(onPin).toHaveBeenCalledTimes(1);
        });

        it('MUST call onArchive when Archive clicked', () => {
            const onArchive = vi.fn();
            render(<ChatHeader {...defaultProps} onArchive={onArchive} />);

            fireEvent.click(screen.getByText('Archive Chat'));

            expect(onArchive).toHaveBeenCalledTimes(1);
        });

        it('MUST call onExport when Export clicked', () => {
            const onExport = vi.fn();
            render(<ChatHeader {...defaultProps} onExport={onExport} />);

            fireEvent.click(screen.getByText('Export to Markdown'));

            expect(onExport).toHaveBeenCalledTimes(1);
        });

        it('MUST call onDelete when Delete clicked', () => {
            const onDelete = vi.fn();
            render(<ChatHeader {...defaultProps} onDelete={onDelete} />);

            fireEvent.click(screen.getByText('Delete Chat'));

            expect(onDelete).toHaveBeenCalledTimes(1);
        });
    });
});
