import { useReducer, Reducer } from 'react';
import type { ContextItem } from '@/features/shared/components/ContextSelector';

/**
 * Reusable reducer hook for complex dialog state management
 * Replaces multiple useState calls with single, predictable state machine
 */
export function useDialogState<T extends object, A>(
    initialState: T,
    reducer: Reducer<T, A>
) {
    return useReducer(reducer, initialState);
}

// ===========================
// Text Replace Dialog State
// ===========================

export type TextReplaceState = {
    activeTab: 'tweak' | 'preview';
    instruction: string;
    preset: string;
    customLength: string;
    result: string;
    selectedContexts: ContextItem[];
    streamingWordCount: number;
};

export type TextReplaceAction =
    | { type: 'START_GENERATE' }
    | { type: 'SET_INSTRUCTION'; payload: string }
    | { type: 'SET_PRESET'; payload: string }
    | { type: 'SET_CUSTOM_LENGTH'; payload: string }
    | { type: 'SET_RESULT'; payload: string }
    | { type: 'SET_SELECTED_CONTEXTS'; payload: ContextItem[] }
    | { type: 'UPDATE_STREAM_COUNT'; payload: number }
    | { type: 'SWITCH_TAB'; payload: 'tweak' | 'preview' }
    | { type: 'RESET' };

export const initialTextReplaceState: TextReplaceState = {
    activeTab: 'tweak',
    instruction: '',
    preset: 'default',
    customLength: '',
    result: '',
    selectedContexts: [],
    streamingWordCount: 0,
};

export function textReplaceReducer(
    state: TextReplaceState,
    action: TextReplaceAction
): TextReplaceState {
    switch (action.type) {
        case 'START_GENERATE':
            return {
                ...state,
                activeTab: 'preview',
                result: '',
                streamingWordCount: 0,
            };
        case 'SET_INSTRUCTION':
            return { ...state, instruction: action.payload };
        case 'SET_PRESET':
            return { ...state, preset: action.payload };
        case 'SET_CUSTOM_LENGTH':
            return { ...state, customLength: action.payload };
        case 'SET_RESULT':
            return { ...state, result: action.payload };
        case 'SET_SELECTED_CONTEXTS':
            return { ...state, selectedContexts: action.payload };
        case 'UPDATE_STREAM_COUNT':
            return { ...state, streamingWordCount: action.payload };
        case 'SWITCH_TAB':
            return { ...state, activeTab: action.payload };
        case 'RESET':
            return initialTextReplaceState;
        default:
            return state;
    }
}

// ===========================
// Tweak Generate Dialog State
// ===========================

export type TweakGenerateState = {
    wordCount: string;
    instructions: string;
    model: string;
    selectedContexts: ContextItem[];
};

export type TweakGenerateAction =
    | { type: 'SET_WORD_COUNT'; payload: string }
    | { type: 'SET_INSTRUCTIONS'; payload: string }
    | { type: 'SET_MODEL'; payload: string }
    | { type: 'SET_SELECTED_CONTEXTS'; payload: ContextItem[] }
    | { type: 'RESET'; payload?: Partial<TweakGenerateState> };

export const createInitialTweakGenerateState = (
    defaultWordCount: number = 400
): TweakGenerateState => ({
    wordCount: defaultWordCount.toString(),
    instructions: '',
    model: '',
    selectedContexts: [],
});

export function tweakGenerateReducer(
    state: TweakGenerateState,
    action: TweakGenerateAction
): TweakGenerateState {
    switch (action.type) {
        case 'SET_WORD_COUNT':
            return { ...state, wordCount: action.payload };
        case 'SET_INSTRUCTIONS':
            return { ...state, instructions: action.payload };
        case 'SET_MODEL':
            return { ...state, model: action.payload };
        case 'SET_SELECTED_CONTEXTS':
            return { ...state, selectedContexts: action.payload };
        case 'RESET':
            return { ...createInitialTweakGenerateState(), ...action.payload };
        default:
            return state;
    }
}

// ===========================
// Continue Writing Menu State
// ===========================

export type ContinueWritingState = {
    wordCount: string;
    model: string;
    showTweakDialog: boolean;
    selectedMode: 'scene-beat' | 'continue-writing' | 'codex-progression';
};

export type ContinueWritingAction =
    | { type: 'SET_WORD_COUNT'; payload: string }
    | { type: 'SET_MODEL'; payload: string }
    | { type: 'OPEN_TWEAK_DIALOG' }
    | { type: 'CLOSE_TWEAK_DIALOG' }
    | { type: 'SET_MODE'; payload: 'scene-beat' | 'continue-writing' | 'codex-progression' };

export const initialContinueWritingState: ContinueWritingState = {
    wordCount: '400',
    model: '',
    showTweakDialog: false,
    selectedMode: 'continue-writing',
};

export function continueWritingReducer(
    state: ContinueWritingState,
    action: ContinueWritingAction
): ContinueWritingState {
    switch (action.type) {
        case 'SET_WORD_COUNT':
            return { ...state, wordCount: action.payload };
        case 'SET_MODEL':
            return { ...state, model: action.payload };
        case 'OPEN_TWEAK_DIALOG':
            return { ...state, showTweakDialog: true };
        case 'CLOSE_TWEAK_DIALOG':
            return { ...state, showTweakDialog: false };
        case 'SET_MODE':
            return { ...state, selectedMode: action.payload };
        default:
            return state;
    }
}

// ===========================
// Text Selection Menu State
// ===========================

export type TextSelectionState = {
    action: 'expand' | 'rephrase' | 'shorten' | null;
    selectedText: string;
    showMenu: boolean;
    menuPosition: { top: number; left: number };
};

export type TextSelectionAction =
    | { type: 'SHOW_MENU'; payload: { text: string; position: { top: number; left: number } } }
    | { type: 'HIDE_MENU' }
    | { type: 'SET_ACTION'; payload: 'expand' | 'rephrase' | 'shorten' | null };

export const initialTextSelectionState: TextSelectionState = {
    action: null,
    selectedText: '',
    showMenu: false,
    menuPosition: { top: 0, left: 0 },
};

export function textSelectionReducer(
    state: TextSelectionState,
    action: TextSelectionAction
): TextSelectionState {
    switch (action.type) {
        case 'SHOW_MENU':
            return {
                ...state,
                selectedText: action.payload.text,
                menuPosition: action.payload.position,
                showMenu: true,
            };
        case 'HIDE_MENU':
            return {
                ...initialTextSelectionState,
            };
        case 'SET_ACTION':
            return { ...state, action: action.payload };
        default:
            return state;
    }
}
