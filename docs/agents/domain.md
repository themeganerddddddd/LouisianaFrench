# Domain Docs

## Layout

This is a single-context repository:

- `CONTEXT.md` contains the domain glossary.
- `docs/adr/` contains hard-to-reverse architecture decisions.

## Consumer Rules

Before exploring or changing code:

1. Read `CONTEXT.md`.
2. Read ADRs relevant to the area being changed.
3. Use the glossary's canonical terms in specs, tickets, tests, and code.
4. Surface a conflict with an ADR instead of silently reversing it.

Create domain documentation lazily. Add a term only when its meaning is resolved, and add an ADR only for a hard-to-reverse, surprising decision made through a real trade-off.
