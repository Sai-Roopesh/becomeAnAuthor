/**
 * Search Components Specification Tests
 * 
 * SPECIFICATIONS:
 * SearchInput:
 * 1. MUST show search icon
 * 2. MUST call onChange with new value
 * 3. MUST use custom placeholder when provided
 * 4. MUST auto-focus on mount
 * 
 * SearchEmptyState:
 * 1. MUST show "No results found" message
 * 2. MUST display the search query
 * 
 * SearchResultItem:
 * 1. MUST show appropriate icon for type
 * 2. MUST show title/name
 * 3. MUST indicate selected state
 * 4. MUST call onClick when clicked
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchInput } from '../SearchInput';
import { SearchEmptyState } from '../SearchEmptyState';
import { SearchResultItem } from '../SearchResultItem';

// ============================================
// Mock Dependencies
// ============================================

vi.mock('lucide-react', () => ({
    Search: () => <span data-testid="search-icon">🔍</span>,
    SearchX: () => <span data-testid="search-x-icon">❌</span>,
    FileText: () => <span data-testid="file-icon">📄</span>,
    BookOpen: () => <span data-testid="book-icon">📖</span>,
}));

vi.mock('@/components/ui/input', () => ({
    Input: ({ value, onChange, placeholder, autoFocus }: {
        value: string;
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
        placeholder: string;
        autoFocus?: boolean;
    }) => (
        <input
            data-testid="search-input"
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            autoFocus={autoFocus}
        />
    ),
}));

vi.mock('@/lib/utils', () => ({
    cn: (...args: (string | boolean | undefined)[]) => args.filter(Boolean).join(' '),
}));

// ============================================
// Test Fixtures
// ============================================

const createSceneResult = (overrides = {}) => ({
    item: {
        id: 'scene-1',
        title: 'Opening Scene',
        summary: 'The story begins...',
        ...overrides,
    },
    score: 0.9,
});

const createCodexResult = (overrides = {}) => ({
    item: {
        id: 'codex-1',
        name: 'Alice',
        category: 'character',
        ...overrides,
    },
    score: 0.85,
});

// ============================================
// SearchInput Tests
// ============================================

describe('SearchInput Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('SPEC: Basic Display', () => {
        it('MUST show search icon', () => {
            render(<SearchInput value="" onChange={() => { }} />);

            expect(screen.getByTestId('search-icon')).toBeInTheDocument();
        });

        it('MUST show input field', () => {
            render(<SearchInput value="" onChange={() => { }} />);

            expect(screen.getByTestId('search-input')).toBeInTheDocument();
        });

        it('MUST use default placeholder when not provided', () => {
            render(<SearchInput value="" onChange={() => { }} />);

            expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
        });

        it('MUST use custom placeholder when provided', () => {
            render(<SearchInput value="" onChange={() => { }} placeholder="Find scenes..." />);

            expect(screen.getByPlaceholderText('Find scenes...')).toBeInTheDocument();
        });
    });

    describe('SPEC: Value Handling', () => {
        it('MUST display current value', () => {
            render(<SearchInput value="test query" onChange={() => { }} />);

            expect(screen.getByTestId('search-input')).toHaveValue('test query');
        });

        it('MUST call onChange with new value on input', () => {
            const mockOnChange = vi.fn();
            render(<SearchInput value="" onChange={mockOnChange} />);

            fireEvent.change(screen.getByTestId('search-input'), {
                target: { value: 'new search' },
            });

            expect(mockOnChange).toHaveBeenCalledWith('new search');
        });
    });
});

// ============================================
// SearchEmptyState Tests
// ============================================

describe('SearchEmptyState Component', () => {
    describe('SPEC: Empty State Display', () => {
        it('MUST show "No results found" message', () => {
            render(<SearchEmptyState query="missing content" />);

            expect(screen.getByText('No results found')).toBeInTheDocument();
        });

        it('MUST display the search query', () => {
            render(<SearchEmptyState query="my search term" />);

            expect(screen.getByText(/my search term/)).toBeInTheDocument();
        });

        it('MUST show search-x icon', () => {
            render(<SearchEmptyState query="test" />);

            expect(screen.getByTestId('search-x-icon')).toBeInTheDocument();
        });

        it('MUST mention scenes and codex entries', () => {
            render(<SearchEmptyState query="test" />);

            expect(screen.getByText(/scenes or codex entries/i)).toBeInTheDocument();
        });
    });
});

// ============================================
// SearchResultItem Tests
// ============================================

describe('SearchResultItem Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('SPEC: Scene Results', () => {
        it('MUST show file icon for scene type', () => {
            render(
                <SearchResultItem
                    result={createSceneResult()}
                    type="scene"
                    isSelected={false}
                    onClick={() => { }}
                />
            );

            expect(screen.getByTestId('file-icon')).toBeInTheDocument();
        });

        it('MUST display scene title', () => {
            render(
                <SearchResultItem
                    result={createSceneResult({ title: 'Chapter One' })}
                    type="scene"
                    isSelected={false}
                    onClick={() => { }}
                />
            );

            expect(screen.getByText('Chapter One')).toBeInTheDocument();
        });

        it('MUST display scene summary', () => {
            render(
                <SearchResultItem
                    result={createSceneResult({ summary: 'A dramatic opening' })}
                    type="scene"
                    isSelected={false}
                    onClick={() => { }}
                />
            );

            expect(screen.getByText('A dramatic opening')).toBeInTheDocument();
        });
    });

    describe('SPEC: Codex Results', () => {
        it('MUST show book icon for codex type', () => {
            render(
                <SearchResultItem
                    result={createCodexResult()}
                    type="codex"
                    isSelected={false}
                    onClick={() => { }}
                />
            );

            expect(screen.getByTestId('book-icon')).toBeInTheDocument();
        });

        it('MUST display codex entry name', () => {
            render(
                <SearchResultItem
                    result={createCodexResult({ name: 'Bob Character' })}
                    type="codex"
                    isSelected={false}
                    onClick={() => { }}
                />
            );

            expect(screen.getByText('Bob Character')).toBeInTheDocument();
        });

        it('MUST display codex category', () => {
            render(
                <SearchResultItem
                    result={createCodexResult({ category: 'location' })}
                    type="codex"
                    isSelected={false}
                    onClick={() => { }}
                />
            );

            expect(screen.getByText('location')).toBeInTheDocument();
        });
    });

    describe('SPEC: Selection State', () => {
        it('MUST show enter key hint when selected', () => {
            render(
                <SearchResultItem
                    result={createSceneResult()}
                    type="scene"
                    isSelected={true}
                    onClick={() => { }}
                />
            );

            expect(screen.getByText('↵')).toBeInTheDocument();
        });

        it('MUST NOT show enter key hint when not selected', () => {
            render(
                <SearchResultItem
                    result={createSceneResult()}
                    type="scene"
                    isSelected={false}
                    onClick={() => { }}
                />
            );

            expect(screen.queryByText('↵')).not.toBeInTheDocument();
        });
    });

    describe('SPEC: Click Behavior', () => {
        it('MUST call onClick when clicked', () => {
            const mockOnClick = vi.fn();

            render(
                <SearchResultItem
                    result={createSceneResult()}
                    type="scene"
                    isSelected={false}
                    onClick={mockOnClick}
                />
            );

            fireEvent.click(screen.getByRole('button'));

            expect(mockOnClick).toHaveBeenCalledTimes(1);
        });
    });
});
