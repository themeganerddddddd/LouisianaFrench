---
version: 1
slug: "src-screens-homescreen-js"
primary_target: "src/screens/HomeScreen.js"
related_targets: []
---

# HomeScreen

## Scope And Mode

**Mode:** Operate

Home is the learner's daily control surface. It identifies the active Language, summarizes relevant Learner Progress, presents secondary destinations compactly, and makes the first incomplete step unmistakable.

## Authority

1. GitHub issue #49 defines product behavior and scope.
2. The `homescreen-redesign` reference's `Homescreen 2b prototype.dc.html`, edge-state HTML, `README.md`, and screenshots define visual and interaction fidelity.
3. `DESIGN.md` defines reusable palette, typography, shape, depth, and state rules.
4. Real Catalog and Learner Progress data replace all prototype placeholders.

## Composition

The single-column reading order is fixed:

1. Safe-area Language gradient header with pelican identity, Language title, compact learner stats or first-use welcome, one current flag control, and four labeled dashboard actions.
2. Dark Today's Plan card with three explicit steps, completion count or Day 1 label, one active CTA, and contextual helper or renewal copy.
3. `WHERE YOU LEFT OFF` or `START HERE` eyebrow.
4. Current Unit card containing the first unfinished Lesson and its direct action; use a dedicated Catalog-complete state when no unfinished Lesson exists.
5. `ALL UNITS` accordion in Catalog order, initially collapsed and permitting multiple Units open.
6. Bundled second-line artwork and existing bug-report action.

The memorable moment is the handoff from the saturated dashboard to the dark plan field: identity immediately resolves into one truthful next action.

## State Matrix

- **Fresh learner:** welcome copy; Review and Mistakes unavailable; Day 1 sequence is Lesson, Lesson, Review; first Lesson is marked `START HERE`.
- **Established learner:** sequence is Review, Lesson, Practice; CTA targets the first incomplete step even when later work was completed out of order.
- **Pending mistakes:** Practice resolves to Mistake Review and exposes the pending count.
- **No mistakes:** Practice resolves to Speech and Mistakes remains visibly unavailable.
- **All done:** all steps show complete and the CTA becomes a live renewal panel.
- **Catalog complete:** current Unit becomes a coherent completion message while All Units remains available.
- **Language switch:** the full semantic palette, Catalog, badges, and plan update together; all Unit sections return collapsed.

## Interaction And Accessibility

- Dashboard circles remain visually 46px; wrappers meet 44pt iOS and 48dp Android targets with separation.
- Every icon has a visible label and accessible name. Disabled actions expose disabled state; accordion headers expose expanded state.
- Done, active, pending, disabled, and expanded states use shape, symbol, copy, and accessibility state in addition to color.
- Press feedback is restrained. Progress and chevrons animate only to explain state; reduced motion uses immediate replacement or a simple fade.
- The renewal timer runs only while the all-done state is visible.
- Native safe areas and navigation gestures remain intact.

## Responsive Behavior

Phones use the approved composition at available compact width. Web preserves the same hierarchy in a centered, bounded column. Text may wrap and cards may grow vertically under large text; dashboard actions, status, and primary actions remain complete.

## Constraints

- Reuse the existing flags, pelican, second-line artwork, Expo gradient, navigation graph, and icon dependency approved by issue #49.
- Preserve Louisiana French and Kouri-Vini as equal Language identities.
- Use actual Unit titles, Lesson titles, counts, Activities, and progress.
- Treat visual fidelity as subordinate only to truthful state, accessibility, and native platform behavior.
- Keep optional prototype toasts and coaching outside the committed surface.
