import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
    useDialogState,
    textReplaceReducer,
    initialTextReplaceState,
    tweakGenerateReducer,
    createInitialTweakGenerateState,
    continueWritingReducer,
    initialContinueWritingState,
    textSelectionReducer,
    initialTextSelectionState,
    TextReplaceAction,
    TweakGenerateAction,
    ContinueWritingAction,
    TextSelectionAction,
} from './use-dialog-state';

describe('useDialogState', () => {
    describe('textReplaceReducer', () => {
        it('should return initial state', () => {
            const state = textReplaceReducer(initialTextReplaceState, { type: 'RESET' });
            expect(state).toEqual(initialTextReplaceState);
        });

        it('should handle START_GENERATE', () => {
            const state = textReplaceReducer(initialTextReplaceState, { type: 'START_GENERATE' });
            expect(state.activeTab).toBe('preview');
            expect(state.result).toBe('');
            expect(state.streamingWordCount).toBe(0);
        });

        it('should handle SET_INSTRUCTION', () => {
            const state = textReplaceReducer(initialTextReplaceState, {
                type: 'SET_INSTRUCTION',
                payload: 'Make it shorter',
            });
            expect(state.instruction).toBe('Make it shorter');
        });

        it('should handle SET_PRESET', () => {
            const state = textReplaceReducer(initialTextReplaceState, {
                type: 'SET_PRESET',
                payload: 'custom',
            });
            expect(state.preset).toBe('custom');
        });

        it('should handle SET_RESULT', () => {
            const state = textReplaceReducer(initialTextReplaceState, {
                type: 'SET_RESULT',
                payload: 'Generated text',
            });
            expect(state.result).toBe('Generated text');
        });

        it('should handle UPDATE_STREAM_COUNT', () => {
            const state = textReplaceReducer(initialTextReplaceState, {
                type: 'UPDATE_STREAM_COUNT',
                payload: 150,
            });
            expect(state.streamingWordCount).toBe(150);
        });

        it('should handle SWITCH_TAB', () => {
            const state = textReplaceReducer(initialTextReplaceState, {
                type: 'SWITCH_TAB',
                payload: 'preview',
            });
            expect(state.activeTab).toBe('preview');
        });

        it('should handle SET_SELECTED_CONTEXTS', () => {
            const contexts = [{ type: 'scene', id: '1', name: 'Test' }];
            const state = textReplaceReducer(initialTextReplaceState, {
                type: 'SET_SELECTED_CONTEXTS',
                payload: contexts as any,
            });
            expect(state.selectedContexts).toEqual(contexts);
        });
    });

    describe('tweakGenerateReducer', () => {
        const initialState = createInitialTweakGenerateState(500);

        it('should create initial state with custom word count', () => {
            expect(initialState.wordCount).toBe('500');
            expect(initialState.instructions).toBe('');
            expect(initialState.model).toBe('');
        });

        it('should handle SET_WORD_COUNT', () => {
            const state = tweakGenerateReducer(initialState, {
                type: 'SET_WORD_COUNT',
                payload: '1000',
            });
            expect(state.wordCount).toBe('1000');
        });

        it('should handle SET_INSTRUCTIONS', () => {
            const state = tweakGenerateReducer(initialState, {
                type: 'SET_INSTRUCTIONS',
                payload: 'Write dramatically',
            });
            expect(state.instructions).toBe('Write dramatically');
        });

        it('should handle SET_MODEL', () => {
            const state = tweakGenerateReducer(initialState, {
                type: 'SET_MODEL',
                payload: 'gpt-4',
            });
            expect(state.model).toBe('gpt-4');
        });

        it('should handle RESET with partial payload', () => {
            const modifiedState = { ...initialState, wordCount: '1000', model: 'gpt-4' };
            const state = tweakGenerateReducer(modifiedState, {
                type: 'RESET',
                payload: { wordCount: '200' },
            });
            expect(state.wordCount).toBe('200');
            expect(state.model).toBe(''); // Reset to default
        });
    });

    describe('continueWritingReducer', () => {
        it('should return initial state', () => {
            expect(initialContinueWritingState.wordCount).toBe('400');
            expect(initialContinueWritingState.showTweakDialog).toBe(false);
            expect(initialContinueWritingState.selectedMode).toBe('continue-writing');
        });

        it('should handle SET_WORD_COUNT', () => {
            const state = continueWritingReducer(initialContinueWritingState, {
                type: 'SET_WORD_COUNT',
                payload: '800',
            });
            expect(state.wordCount).toBe('800');
        });

        it('should handle SET_MODEL', () => {
            const state = continueWritingReducer(initialContinueWritingState, {
                type: 'SET_MODEL',
                payload: 'claude-3',
            });
            expect(state.model).toBe('claude-3');
        });

        it('should handle OPEN_TWEAK_DIALOG', () => {
            const state = continueWritingReducer(initialContinueWritingState, {
                type: 'OPEN_TWEAK_DIALOG',
            });
            expect(state.showTweakDialog).toBe(true);
        });

        it('should handle CLOSE_TWEAK_DIALOG', () => {
            const openState = { ...initialContinueWritingState, showTweakDialog: true };
            const state = continueWritingReducer(openState, {
                type: 'CLOSE_TWEAK_DIALOG',
            });
            expect(state.showTweakDialog).toBe(false);
        });

        it('should handle SET_MODE', () => {
            const state = continueWritingReducer(initialContinueWritingState, {
                type: 'SET_MODE',
                payload: 'scene-beat',
            });
            expect(state.selectedMode).toBe('scene-beat');
        });
    });

    describe('textSelectionReducer', () => {
        it('should return initial state', () => {
            expect(initialTextSelectionState.showMenu).toBe(false);
            expect(initialTextSelectionState.selectedText).toBe('');
            expect(initialTextSelectionState.action).toBeNull();
        });

        it('should handle SHOW_MENU', () => {
            const state = textSelectionReducer(initialTextSelectionState, {
                type: 'SHOW_MENU',
                payload: {
                    text: 'Selected text',
                    position: { top: 100, left: 200 },
                },
            });
            expect(state.showMenu).toBe(true);
            expect(state.selectedText).toBe('Selected text');
            expect(state.menuPosition).toEqual({ top: 100, left: 200 });
        });

        it('should handle HIDE_MENU', () => {
            const openState = {
                ...initialTextSelectionState,
                showMenu: true,
                selectedText: 'Some text',
            };
            const state = textSelectionReducer(openState, { type: 'HIDE_MENU' });
            expect(state).toEqual(initialTextSelectionState);
        });

        it('should handle SET_ACTION', () => {
            const state = textSelectionReducer(initialTextSelectionState, {
                type: 'SET_ACTION',
                payload: 'expand',
            });
            expect(state.action).toBe('expand');
        });
    });

    describe('useDialogState hook', () => {
        it('should work with textReplaceReducer', () => {
            const { result } = renderHook(() =>
                useDialogState(initialTextReplaceState, textReplaceReducer)
            );

            const [state, dispatch] = result.current;
            expect(state).toEqual(initialTextReplaceState);

            act(() => {
                dispatch({ type: 'SET_INSTRUCTION', payload: 'Test instruction' });
            });

            expect(result.current[0].instruction).toBe('Test instruction');
        });

        it('should work with tweakGenerateReducer', () => {
            const { result } = renderHook(() =>
                useDialogState(createInitialTweakGenerateState(300), tweakGenerateReducer)
            );

            expect(result.current[0].wordCount).toBe('300');

            act(() => {
                result.current[1]({ type: 'SET_WORD_COUNT', payload: '600' });
            });

            expect(result.current[0].wordCount).toBe('600');
        });
    });
});
