#!/usr/bin/env node

import { printJson, run } from './lib/repo.mjs';

function flagValue(args, name) {
  const index = args.indexOf(name);
  if (index === -1 || index === args.length - 1) return null;
  return args[index + 1];
}

function fetchIssue(number) {
  return JSON.parse(
    run('gh', [
      'issue',
      'view',
      String(number),
      '--json',
      'number,title,state,body,comments,url'
    ])
  );
}

function checkboxCriteria(body) {
  const criteria = [];
  for (const line of (body || '').split(/\r?\n/)) {
    const match = line.match(/^\s*[-*]\s+\[([ xX])\]\s+(.+)$/);
    if (!match) continue;
    criteria.push({
      checked: match[1].toLowerCase() === 'x',
      text: match[2].trim(),
      raw: line.trim()
    });
  }
  return criteria;
}

function ownerFromCriterion(raw) {
  const match = raw.match(/\(owner:\s*#(\d+)\)/i);
  return match ? Number(match[1]) : null;
}

function parseChildNumbers(body, comments, parentNumber) {
  const corpus = [body || '', ...(comments || []).map((c) => c.body || '')].join('\n');
  const numbers = new Set();
  for (const match of corpus.matchAll(/\bBlocked by\s+#(\d+)/gi)) numbers.add(Number(match[1]));
  for (const match of corpus.matchAll(/\bchild(?:ren)?\s*:?\s*#(\d+)/gi)) {
    numbers.add(Number(match[1]));
  }
  for (const match of corpus.matchAll(/children[^\n]*#(\d+)/gi)) numbers.add(Number(match[1]));
  numbers.delete(parentNumber);
  return [...numbers].sort((a, b) => a - b);
}

function main() {
  const args = process.argv.slice(2);
  const parentNumber = Number(flagValue(args, '--parent'));
  const childrenRaw = flagValue(args, '--children');

  if (!Number.isInteger(parentNumber) || parentNumber <= 0) {
    console.error(
      'Usage: node .opencode/scripts/validate-ledger.mjs --parent <n> [--children a,b,c]'
    );
    process.exit(1);
  }

  const parent = fetchIssue(parentNumber);
  const comments = Array.isArray(parent.comments)
    ? parent.comments
    : parent.comments?.nodes || [];
  const criteria = checkboxCriteria(parent.body);

  const childrenFromArgs = childrenRaw
    ? childrenRaw
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isInteger(n) && n > 0)
    : null;
  const childNumbers = childrenFromArgs || parseChildNumbers(parent.body, comments, parentNumber);

  const childIssues = [];
  for (const number of childNumbers) {
    try {
      childIssues.push(fetchIssue(number));
    } catch {
      childIssues.push({ number, body: '', fetchFailed: true });
    }
  }

  const ownedByChildren =
    /owned by children/i.test(parent.body || '') && childNumbers.length > 0;

  const ledger = [];
  const reasons = [];

  for (const criterion of criteria) {
    const ownerTag = ownerFromCriterion(criterion.raw);
    let owner = ownerTag;
    let how = ownerTag ? 'owner-tag' : null;

    if (!owner) {
      const claiming = childIssues.filter((child) => {
        const body = child.body || '';
        return body.includes(criterion.text);
      });
      if (claiming.length === 1) {
        owner = claiming[0].number;
        how = 'child-body-claim';
      } else if (claiming.length > 1) {
        how = 'ambiguous-child-claim';
      }
    }

    if (!owner && ownedByChildren) {
      owner = 'children';
      how = 'owned-by-children';
    }

    // Prefer requiring (owner: #N) on each criterion for PASS
    const passOwner = ownerTag != null;
    ledger.push({
      criterion: criterion.text,
      checked: criterion.checked,
      owner: ownerTag || owner || null,
      how,
      pass: passOwner
    });

    if (!passOwner) {
      reasons.push(
        `Criterion lacks (owner: #N) tag: ${criterion.text.slice(0, 120)}${
          criterion.text.length > 120 ? '…' : ''
        }`
      );
    }
  }

  if (criteria.length === 0) {
    reasons.push('Parent issue has no acceptance-criteria checkboxes (- [ ] / - [x]).');
  }

  const pass = criteria.length > 0 && reasons.length === 0;
  printJson({
    verdict: pass ? 'PASS' : 'BLOCKED',
    reasons,
    counts: {
      criteria: criteria.length,
      owned: ledger.filter((row) => row.pass).length,
      children: childNumbers.length
    },
    parent: parentNumber,
    children: childNumbers,
    ledger
  });
  process.exit(pass ? 0 : 2);
}

main();
