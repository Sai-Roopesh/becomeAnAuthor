#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const protagonists = ['Mara', 'Ishan', 'Selene', 'Jonah', 'Anya', 'Rook'];
const settings = [
  'abandoned observatory',
  'flooded market',
  'snowbound monastery',
  'desert caravan hub',
  'underground rail station',
  'floating archive',
];
const tensions = [
  'must choose between loyalty and truth',
  'is running out of time before dawn',
  'cannot reveal their real identity',
  'is being watched by a rival faction',
  'must recover a stolen map',
];
const styles = [
  'tense and cinematic',
  'lyrical but grounded',
  'dialogue-forward with subtext',
  'compressed and punchy',
  'introspective with sensory detail',
];

function buildCase(index, protagonist, setting, tension, style) {
  const id = `ctx-${String(index + 1).padStart(3, '0')}`;
  const requiredFacts = [
    `${protagonist} is in the ${setting}`,
    `${protagonist} ${tension}`,
    'the response must avoid contradicting provided context',
  ];

  return {
    id,
    title: `Context fidelity regression ${index + 1}`,
    prompt: [
      `Context: ${protagonist} enters the ${setting}.`,
      `Constraint: ${protagonist} ${tension}.`,
      'Task: Continue the scene in 120-180 words.',
      `Style target: ${style}.`,
      'Do not add new lore that conflicts with context.',
    ].join('\n'),
    requiredFacts,
    styleHints: style.split(' ').filter((token) => token.length > 3),
    minWords: 120,
    maxWords: 180,
  };
}

const cases = [];
for (let i = 0; i < 60; i += 1) {
  const protagonist = protagonists[i % protagonists.length];
  const setting = settings[i % settings.length];
  const tension = tensions[i % tensions.length];
  const style = styles[i % styles.length];
  cases.push(buildCase(i, protagonist, setting, tension, style));
}

const outputPath = path.resolve(
  __dirname,
  '../docs/ai-evals/context-regression-cases.json'
);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(cases, null, 2));

console.log(`Generated ${cases.length} eval cases at ${outputPath}`);
