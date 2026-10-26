#!/usr/bin/env node

import { exists, printJson, readText } from './lib/repo.mjs';

const REQUIRED = [
  'State closure',
  'Journey ownership',
  'Churn anatomy',
  'Decomposition',
  'Parent coverage',
  'Human decisions',
  'Fixture-first'
];

function findHeadings(text) {
  const headingPattern = /^#{1,6}\s+(.+?)\s*$/gm;
  const headings = [];
  let match;
  while ((match = headingPattern.exec(text)) !== null) {
    headings.push({
      title: match[1].trim(),
      index: match.index,
      end: match.index + match[0].length
    });
  }
  return headings;
}

function findSectionIndex(headings, name) {
  const lower = name.toLowerCase();
  return headings.findIndex((h) => h.title.toLowerCase() === lower);
}

function sectionBody(text, headings, idx) {
  if (idx === -1) return null;
  const start = headings[idx].end;
  const end = idx + 1 < headings.length ? headings[idx + 1].index : text.length;
  return text.slice(start, end).trim();
}

function humanDecisionsOk(body) {
  if (body == null) return false;
  if (body.length === 0) return true;
  const normalized = body
    .toLowerCase()
    .replace(/[_*`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return (
    /^(none|n\/a|na|resolved|no open decisions|no decisions)(\.|!)?$/.test(normalized) ||
    /^(none|n\/a|na|resolved)\b/.test(normalized) ||
    /no (open|pending|unresolved) decisions/i.test(body)
  );
}

function main() {
  const planPath = process.argv[2];
  if (!planPath) {
    console.error('Usage: node .opencode/scripts/validate-plan.mjs <plan.md>');
    process.exit(1);
  }
  if (!exists(planPath)) {
    printJson({
      verdict: 'BLOCKED',
      reasons: [`Plan file not found: ${planPath}`]
    });
    process.exit(2);
  }

  const text = readText(planPath);
  const headings = findHeadings(text);
  const reasons = [];
  const missing = [];

  for (const name of REQUIRED) {
    if (findSectionIndex(headings, name) === -1) missing.push(name);
  }
  if (missing.length > 0) {
    reasons.push(`Missing required section(s): ${missing.join(', ')}`);
  }

  const humanIdx = findSectionIndex(headings, 'Human decisions');
  let humanOk = false;
  if (humanIdx !== -1) {
    const body = sectionBody(text, headings, humanIdx);
    humanOk = humanDecisionsOk(body);
    if (!humanOk) reasons.push('Human decisions section is not empty/none/resolved.');
  }

  const pass = missing.length === 0 && humanOk;
  printJson({
    verdict: pass ? 'PASS' : 'BLOCKED',
    reasons,
    counts: {
      requiredSections: REQUIRED.length,
      presentSections: REQUIRED.length - missing.length,
      missingSections: missing.length
    },
    missing
  });
  process.exit(pass ? 0 : 2);
}

main();
