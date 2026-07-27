// PROTOTYPE — throwaway. Simulates KD-01, KD-06 fixes.
// Run: node prototype/defect-fix-prototype.mjs

import { createInterface } from 'readline';

const rl = createInterface({ input: process.stdin, output: process.stdout });
function ask(q) { return new Promise(resolve => rl.question(q, resolve)); }

// ─── State helpers ───

function state(s) { return JSON.parse(JSON.stringify(s)); }

function fmt(s) { return JSON.stringify(s, null, 2); }

// ─── Ticket 07: Daily Review final mistake ───

function beforeFix07(queue, index, xp, mistakes, wordProgress, cardState) {
  const current = queue[index];
  const isFinal = index === queue.length - 1;

  // handleWrong
  cardState[current.cardId] = { quality: 2 };
  wordProgress[current.rowId] = 'incorrect';
  mistakes.push({ ...current, userAnswer: 'wrong' });

  if (isFinal) {
    // BUG: calls handleCorrect on final item
    cardState[current.cardId] = { quality: 5 };
    wordProgress[current.rowId] = 'correct';
    xp += 8; // double-scored
  } else {
    // not final — correct path
    xp += 0;
  }

  return { xp, mistakes, cardState, wordProgress };
}

function afterFix07(queue, index, xp, mistakes, wordProgress, cardState) {
  const current = queue[index];
  const isFinal = index === queue.length - 1;

  // handleWrong
  cardState[current.cardId] = { quality: 2 };
  wordProgress[current.rowId] = 'incorrect';
  mistakes.push({ ...current, userAnswer: 'wrong' });

  if (isFinal) {
    // FIX: complete session, do NOT call handleCorrect
    xp += 0;
  } else {
    xp += 0;
  }

  return { xp, mistakes, cardState, wordProgress };
}

// ─── Ticket 09: Missing lesson ───

function beforeFix09(lesson) {
  // lesson.activities throws before !lesson guard
  try {
    const activities = lesson.activities; // BOOM
    return { ok: true, activities };
  } catch (e) {
    return { ok: false, error: `TypeError: Cannot read properties of undefined (reading 'activities')` };
  }
}

function afterFix09(lesson) {
  if (!lesson) {
    return { ok: false, recovery: 'navigate to Home', message: 'Lesson not found' };
  }
  const activities = lesson.activities || [];
  return { ok: true, activities };
}

// ─── Ticket 08: Leaderboard ───

function lessonCompleteButtonsBefore() {
  return [
    { label: 'Back to Home', registered: true },
    { label: 'Open Leaderboard (WIP)', registered: false },
  ];
}

function lessonCompleteButtonsAfter() {
  return [
    { label: 'Back to Home', registered: true },
  ];
}

// ─── Runner ───

async function run() {
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║  KD-01 / KD-02 / KD-06  PROTOTYPE   ║');
  console.log('║  Defect fixes — before vs after      ║');
  console.log('╚══════════════════════════════════════╝\n');

  while (true) {
    console.log('1. KD-01  Daily Review final mistake');
    console.log('2. KD-06  Missing lesson crash');
    console.log('3. KD-02  Leaderboard unregistered route');
    console.log('4. Exit\n');
    const choice = await ask('Pick a scenario (1-4): ');

    if (choice === '1') {
      // ── KD-01 ──
      const queue = [{ cardId: 'card:1', rowId: 'w01', prompt: 'Choose match' }];
      const index = 0; // final (only) item

      console.log('\n--- BEFORE fix ---');
      let s = beforeFix07(queue, index, 0, [], {}, {});
      console.log('State after final wrong:');
      console.log(fmt(s));
      console.log('BUG: quality 5 recorded (should be 2), word marked correct (should be incorrect)');

      console.log('\n--- AFTER fix ---');
      s = afterFix07(queue, index, 0, [], {}, {});
      console.log('State after final wrong:');
      console.log(fmt(s));
      console.log('FIX: quality 2, word incorrect, no double XP. Session completes.');

    } else if (choice === '2') {
      // ── KD-06 ──
      console.log('\n--- BEFORE fix (lesson is undefined) ---');
      let result = beforeFix09(undefined);
      console.log(fmt(result));

      console.log('\n--- AFTER fix (lesson is undefined) ---');
      result = afterFix09(undefined);
      console.log(fmt(result));

      console.log('\n--- AFTER fix (valid lesson) ---');
      result = afterFix09({ activities: [{ cardId: 'c:1' }, { cardId: 'c:2' }] });
      console.log(fmt(result));

    } else if (choice === '3') {
      // ── KD-02 ──
      console.log('\n--- BEFORE fix (LessonComplete buttons) ---');
      console.log(fmt(lessonCompleteButtonsBefore()));
      console.log('issue: "Open Leaderboard (WIP)" navigates to unregistered route');

      console.log('\n--- AFTER fix (leaderboard removed) ---');
      console.log(fmt(lessonCompleteButtonsAfter()));
      console.log('fix: all buttons point to registered routes');

    } else if (choice === '4') {
      break;
    }
    console.log('');
  }

  rl.close();
  console.log('Done. Remember: prototype is throwaway — commit decisions to tickets.\n');
}

run();
