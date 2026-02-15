#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = {
    cases: path.resolve(
      __dirname,
      '../docs/ai-evals/context-regression-cases.json'
    ),
    responses: '',
    report: path.resolve(__dirname, '../docs/ai-evals/last-report.json'),
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--cases' && next) {
      args.cases = path.resolve(process.cwd(), next);
      i += 1;
    } else if (arg === '--responses' && next) {
      args.responses = path.resolve(process.cwd(), next);
      i += 1;
    } else if (arg === '--report' && next) {
      args.report = path.resolve(process.cwd(), next);
      i += 1;
    }
  }

  if (!args.responses) {
    throw new Error('Missing required argument: --responses <file>');
  }

  return args;
}

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function containsFact(output, fact) {
  const normalizedOutput = normalize(output);
  const terms = normalize(fact)
    .split(' ')
    .filter((token) => token.length > 2);

  if (terms.length === 0) {
    return true;
  }

  return terms.every((term) => normalizedOutput.includes(term));
}

function scoreGroundedness(output, requiredFacts) {
  if (!requiredFacts || requiredFacts.length === 0) {
    return 1;
  }

  let hits = 0;
  for (const fact of requiredFacts) {
    if (containsFact(output, fact)) {
      hits += 1;
    }
  }

  return hits / requiredFacts.length;
}

function scoreStyle(output, styleHints) {
  if (!styleHints || styleHints.length === 0) {
    return 1;
  }

  const normalizedOutput = normalize(output);
  let hits = 0;
  for (const hint of styleHints) {
    const normalizedHint = normalize(hint);
    if (normalizedHint && normalizedOutput.includes(normalizedHint)) {
      hits += 1;
    }
  }

  return hits / styleHints.length;
}

function scoreAdherence(output, minWords, maxWords) {
  const words = String(output || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  let wordScore = 1;
  if (minWords && words < minWords) {
    const delta = minWords - words;
    wordScore = Math.max(0, 1 - delta / Math.max(minWords, 1));
  }
  if (maxWords && words > maxWords) {
    const delta = words - maxWords;
    wordScore = Math.max(0, 1 - delta / Math.max(maxWords, 1));
  }

  const normalizedOutput = normalize(output);
  const refusalPenalty =
    normalizedOutput.includes('as an ai') ||
    normalizedOutput.includes('i cannot') ||
    normalizedOutput.includes('i can t')
      ? 0.3
      : 0;

  return Math.max(0, wordScore - refusalPenalty);
}

function scoreCase(testCase, output) {
  const groundedness = scoreGroundedness(output, testCase.requiredFacts);
  const styleMatch = scoreStyle(output, testCase.styleHints);
  const instructionAdherence = scoreAdherence(
    output,
    testCase.minWords,
    testCase.maxWords
  );

  const total =
    groundedness * 0.5 + styleMatch * 0.25 + instructionAdherence * 0.25;

  return {
    groundedness,
    styleMatch,
    instructionAdherence,
    total,
    pass: total >= 0.7,
  };
}

function loadJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function normalizeResponses(responsePayload) {
  if (Array.isArray(responsePayload)) {
    const map = new Map();
    for (const row of responsePayload) {
      if (row && row.id) {
        map.set(String(row.id), String(row.response || row.output || ''));
      }
    }
    return map;
  }

  if (responsePayload && typeof responsePayload === 'object') {
    const map = new Map();
    for (const [id, output] of Object.entries(responsePayload)) {
      map.set(String(id), String(output || ''));
    }
    return map;
  }

  throw new Error('Unsupported response format. Use array or object map.');
}

function main() {
  const args = parseArgs(process.argv);
  const cases = loadJson(args.cases);
  const responses = normalizeResponses(loadJson(args.responses));

  const results = [];
  for (const testCase of cases) {
    const output = responses.get(testCase.id) || '';
    const scores = scoreCase(testCase, output);

    results.push({
      id: testCase.id,
      title: testCase.title,
      output,
      scores,
    });
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    totalCases: results.length,
    passCount: results.filter((r) => r.scores.pass).length,
    failCount: results.filter((r) => !r.scores.pass).length,
    averages: {
      groundedness:
        results.reduce((sum, r) => sum + r.scores.groundedness, 0) /
        Math.max(results.length, 1),
      styleMatch:
        results.reduce((sum, r) => sum + r.scores.styleMatch, 0) /
        Math.max(results.length, 1),
      instructionAdherence:
        results.reduce((sum, r) => sum + r.scores.instructionAdherence, 0) /
        Math.max(results.length, 1),
      total:
        results.reduce((sum, r) => sum + r.scores.total, 0) /
        Math.max(results.length, 1),
    },
    worstCases: results
      .slice()
      .sort((a, b) => a.scores.total - b.scores.total)
      .slice(0, 10)
      .map((r) => ({ id: r.id, score: r.scores.total })),
  };

  fs.mkdirSync(path.dirname(args.report), { recursive: true });
  fs.writeFileSync(
    args.report,
    JSON.stringify(
      {
        summary,
        results,
      },
      null,
      2
    )
  );

  console.log(`AI eval report written to ${args.report}`);
  console.log(
    `Pass rate: ${summary.passCount}/${summary.totalCases} (${(
      (summary.passCount / Math.max(summary.totalCases, 1)) *
      100
    ).toFixed(1)}%)`
  );
}

main();
