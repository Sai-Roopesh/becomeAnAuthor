import type { CodexTemplate, TemplateField, CodexRelationType, RelationCategory } from '@/domain/entities/types';

/**
 * Built-in Templates Seed Data
 * 
 * These templates will be inserted on first app load
 * ✅ All data is serializable (no functions/Promises)
 */

// Character template with comprehensive fields
const characterTemplate: Omit<CodexTemplate, 'id' | 'createdAt'> = {
    name: 'Character (Detailed)',
    category: 'character',
    isBuiltIn: true,
    fields: [
        {
            id: 'full_name',
            name: 'Full Name',
            type: 'text',
            required: true,
            placeholder: 'First Middle Last',
            helperText: 'Character\'s full legal name'
        },
        {
            id: 'age',
            name: 'Age',
            type: 'number',
            required: false,
            min: 0,
            max: 200,
            placeholder: '25'
        },
        {
            id: 'role',
            name: 'Story Role',
            type: 'select',
            required: true,
            options: ['Protagonist', 'Antagonist', 'Supporting', 'Minor'],
            defaultValue: 'Supporting'
        },
        {
            id: 'personality',
            name: 'Personality Traits',
            type: 'textarea',
            required: false,
            placeholder: 'Brave, compassionate, stubborn...',
            helperText: 'Key personality characteristics'
        },
        {
            id: 'backstory',
            name: 'Backstory',
            type: 'textarea',
            required: false,
            placeholder: 'Where did they come from?',
            helperText: 'Character history and formative events'
        },
        {
            id: 'goal',
            name: 'Primary Goal',
            type: 'text',
            required: false,
            placeholder: 'What do they want?',
            helperText: 'What drives this character?'
        },
        {
            id: 'fear',
            name: 'Greatest Fear',
            type: 'text',
            required: false,
            placeholder: 'What holds them back?',
            helperText: 'Internal or external obstacle'
        },
    ]
};

// Location template
const locationTemplate: Omit<CodexTemplate, 'id' | 'createdAt'> = {
    name: 'Location (World-building)',
    category: 'location',
    isBuiltIn: true,
    fields: [
        {
            id: 'type',
            name: 'Location Type',
            type: 'select',
            required: true,
            options: ['City', 'Building', 'Country', 'Planet', 'Region', 'Natural Feature', 'Other']
        },
        {
            id: 'population',
            name: 'Population',
            type: 'number',
            required: false,
            min: 0,
            placeholder: '10000'
        },
        {
            id: 'climate',
            name: 'Climate',
            type: 'select',
            required: false,
            options: ['Tropical', 'Desert', 'Temperate', 'Arctic', 'Varied', 'Other']
        },
        {
            id: 'geography',
            name: 'Geography',
            type: 'textarea',
            required: false,
            placeholder: 'Mountains, rivers, terrain...',
            helperText: 'Physical features of the location'
        },
        {
            id: 'government',
            name: 'Government/Leadership',
            type: 'text',
            required: false,
            placeholder: 'Democracy, Monarchy, etc.'
        },
        {
            id: 'culture',
            name: 'Culture & Customs',
            type: 'textarea',
            required: false,
            placeholder: 'Traditions, beliefs, social norms...'
        },
    ]
};

// Item template  
const itemTemplate: Omit<CodexTemplate, 'id' | 'createdAt'> = {
    name: 'Item/Object',
    category: 'item',
    isBuiltIn: true,
    fields: [
        {
            id: 'type',
            name: 'Item Type',
            type: 'select',
            required: true,
            options: ['Weapon', 'Tool', 'Artifact', 'Technology', 'Clothing', 'Vehicle', 'Other']
        },
        {
            id: 'significance',
            name: 'Significance',
            type: 'select',
            required: false,
            options: ['Common', 'Uncommon', 'Rare', 'Legendary', 'Unique'],
            defaultValue: 'Common'
        },
        {
            id: 'appearance',
            name: 'Appearance',
            type: 'textarea',
            required: false,
            placeholder: 'What does it look like?'
        },
        {
            id: 'powers',
            name: 'Powers/Abilities',
            type: 'textarea',
            required: false,
            placeholder: 'Special properties or functions'
        },
        {
            id: 'history',
            name: 'History/Origin',
            type: 'textarea',
            required: false,
            placeholder: 'How was it created? Who owned it?'
        },
    ]
};

// Lore template
const loreTemplate: Omit<CodexTemplate, 'id' | 'createdAt'> = {
    name: 'Lore/Mythology',
    category: 'lore',
    isBuiltIn: true,
    fields: [
        {
            id: 'type',
            name: 'Lore Type',
            type: 'select',
            required: true,
            options: ['Myth', 'Legend', 'Historical Event', 'Religion', 'Magic System', 'Prophecy', 'Other']
        },
        {
            id: 'summary',
            name: 'Summary',
            type: 'textarea',
            required: true,
            placeholder: 'Brief overview of this lore element'
        },
        {
            id: 'origin',
            name: 'Origin',
            type: 'text',
            required: false,
            placeholder: 'When/where did this originate?'
        },
        {
            id: 'significance',
            name: 'Cultural Significance',
            type: 'textarea',
            required: false,
            placeholder: 'How does this affect the world?'
        },
    ]
};

// Subplot template
const subplotTemplate: Omit<CodexTemplate, 'id' | 'createdAt'> = {
    name: 'Subplot/Thread',
    category: 'subplot',
    isBuiltIn: true,
    fields: [
        {
            id: 'status',
            name: 'Status',
            type: 'select',
            required: true,
            options: ['Planning', 'Active', 'Resolved', 'Abandoned'],
            defaultValue: 'Planning'
        },
        {
            id: 'conflict',
            name: 'Central Conflict',
            type: 'textarea',
            required: true,
            placeholder: 'What is the core conflict of this subplot?'
        },
        {
            id: 'resolution',
            name: 'Resolution',
            type: 'textarea',
            required: false,
            placeholder: 'How does this subplot resolve?'
        },
    ]
};

export const BUILT_IN_TEMPLATES: Omit<CodexTemplate, 'id' | 'createdAt'>[] = [
    characterTemplate,
    locationTemplate,
    itemTemplate,
    loreTemplate,
    subplotTemplate,
];

/**
 * Built-in Relationship Types
 */
export const BUILT_IN_RELATION_TYPES: Omit<CodexRelationType, 'id'>[] = [
    {
        name: 'Family',
        category: 'personal',
        color: '#ef4444',
        isDirectional: false,
        isBuiltIn: true,
        canHaveStrength: false
    },
    {
        name: 'Friend',
        category: 'personal',
        color: '#10b981',
        isDirectional: false,
        isBuiltIn: true,
        canHaveStrength: true
    },
    {
        name: 'Enemy',
        category: 'personal',
        color: '#dc2626',
        isDirectional: true,
        isBuiltIn: true,
        canHaveStrength: true
    },
    {
        name: 'Mentor',
        category: 'personal',
        color: '#8b5cf6',
        isDirectional: true,
        isBuiltIn: true,
        canHaveStrength: false
    },
    {
        name: 'Ally',
        category: 'professional',
        color: '#3b82f6',
        isDirectional: false,
        isBuiltIn: true,
        canHaveStrength: true
    },
    {
        name: 'Rival',
        category: 'professional',
        color: '#f59e0b',
        isDirectional: false,
        isBuiltIn: true,
        canHaveStrength: true
    },
    {
        name: 'Located In',
        category: 'geographical',
        color: '#14b8a6',
        isDirectional: true,
        isBuiltIn: true,
        canHaveStrength: false
    },
    {
        name: 'Owns',
        category: 'item',
        color: '#6366f1',
        isDirectional: true,
        isBuiltIn: true,
        canHaveStrength: false
    },
    {
        name: 'Created By',
        category: 'item',
        color: '#84cc16',
        isDirectional: true,
        isBuiltIn: true,
        canHaveStrength: false
    },
    {
        name: 'Related To',
        category: 'lore',
        color: '#a855f7',
        isDirectional: false,
        isBuiltIn: true,
        canHaveStrength: false
    },
];
