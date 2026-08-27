---
name: Louisiana Languages
description: A compact bilingual learning system that turns real progress into a clear daily flight plan.
colors:
  white: "#FFFFFF"
  page: "#F4F7FB"
  border: "#E2E8F0"
  divider: "#F1F5F9"
  ink: "#102A43"
  muted: "#64748B"
  review-badge: "#FFCD00"
  danger: "#DC2626"
  cajun-sky: "#498BDC"
  cajun-accent: "#2771CB"
  cajun-complete: "#3B82F6"
  cajun-soft: "#7DD3FC"
  cajun-subtitle: "#DCEBFF"
  cajun-timer: "#DBEAFE"
  kouri-sky: "#0AA35F"
  kouri-deep: "#066B3F"
  kouri-accent: "#08834C"
  kouri-complete: "#10B981"
  kouri-soft: "#6EE7B7"
  kouri-subtitle: "#E7F5EE"
  kouri-plan: "#064E32"
  kouri-timer: "#D1FAE5"
typography:
  display:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "22px"
    fontWeight: 800
    lineHeight: 1.2
  headline:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "18px"
    fontWeight: 900
    lineHeight: 1.25
  title:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "15px"
    fontWeight: 800
    lineHeight: 1.3
  body:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.4
  label:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1.25
rounded:
  flag: "4px"
  control: "12px"
  tile: "16px"
  card: "18px"
  pill: "999px"
spacing:
  xs: "6px"
  sm: "8px"
  md: "12px"
  content: "14px"
  lg: "16px"
  card: "18px"
  header: "20px"
components:
  button-cajun:
    backgroundColor: "{colors.cajun-accent}"
    textColor: "{colors.white}"
    typography: "{typography.title}"
    rounded: "{rounded.control}"
    padding: "13px 16px"
  button-kouri:
    backgroundColor: "{colors.kouri-accent}"
    textColor: "{colors.white}"
    typography: "{typography.title}"
    rounded: "{rounded.control}"
    padding: "13px 16px"
  card:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "{spacing.card}"
  badge-review:
    backgroundColor: "{colors.review-badge}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "1px 6px"
  badge-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.white}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "1px 6px"
---

# Design System: Louisiana Languages

## Overview

**Creative North Star: "Daily Flight Plan"**

The system behaves like a compact instrument panel for learning: Language identity is unmistakable, current state is legible at a glance, and one truthful next action leads. It is optimistic without becoming game-like, using saturated Language fields above calm, cool surfaces.

Home establishes the reusable world rather than donating its exact composition to every screen. Other surfaces inherit the Language palettes, type hierarchy, tonal containment, rounded controls, progress semantics, and concise state language while retaining native navigation and task-specific structure.

**Key Characteristics:**
- Two equal Language identities, never a primary brand plus a secondary variant.
- Compact, confident controls with explicit labels and state.
- Tonal hierarchy built from color fields, borders, and progress fills.
- Dense information arranged in one calm reading order.
- System typography and native behavior before decorative novelty.

## Colors

The palette pairs a cool cloud page with a blue Louisiana French identity and a green Kouri-Vini identity. Both themes use the same semantic roles so switching Language changes identity without changing hierarchy.

### Primary
- **Louisiana Sky:** opens Louisiana French identity fields and gradients.
- **Louisiana Action:** carries Louisiana French actions and active controls.
- **Kouri Canopy:** opens Kouri-Vini identity fields and gradients.
- **Kouri Action:** carries Kouri-Vini actions and active controls.

### Secondary
- **Louisiana Air:** marks completed progress and connective state in the blue theme.
- **Kouri Mint:** marks completed progress and connective state in the green theme.

### Tertiary
- **Review Gold:** signals due Review work and always carries dark ink.
- **Mistake Red:** signals pending mistakes and always carries white text.

### Neutral
- **Cloud Page:** keeps long learning flows quiet and separates them from saturated identity fields.
- **White Surface:** carries cards, pills, active plan steps, and icon linework.
- **Bayou Ink:** anchors body copy and the Louisiana plan field.
- **Slate Note:** carries secondary copy, metadata, and eyebrows.
- **Mist Border / Divider:** separates surfaces without creating shadow-heavy stacks.

**The Language Role Rule.** Blue and green occupy identical semantic roles; a Language switch changes values, never component hierarchy.

**The Badge Contrast Rule.** Gold uses dark ink, red uses white, and neither badge color becomes decoration.

## Typography

**Display Font:** Native system sans serif

**Body Font:** Native system sans serif

**Character:** The hierarchy is compact and strongly weighted. Weight, size, and placement create structure while the native system face preserves platform familiarity and text scaling.

### Hierarchy
- **Display** (800, 22px, 1.2): Language and top-level surface identity.
- **Headline** (900, 18px, 1.25): plan and major card headings.
- **Title** (800, 15px, 1.3): actions, Lessons, and decisive row labels.
- **Body** (600, 13px, 1.4): descriptions and progress metadata.
- **Label** (700, 12px, 1.25): dashboard labels, status, and eyebrows; eyebrows may add restrained tracking and uppercase.

**The Weight Carries Hierarchy Rule.** Use the established weight ladder before adding typefaces, colors, or decorative treatments.

## Layout

Surfaces use a single-column task flow with a compact content gutter. Saturated identity regions may reach the screen edges; working content sits on the Cloud Page with a 14px gutter and 12-18px vertical rhythm. Cards use 18px internal padding when they lead a task and 12-16px for dense rows.

Native layouts fill the available compact width inside safe-area insets. Responsive web keeps the same hierarchy in a centered, phone-oriented column rather than stretching into a desktop dashboard. Large text may increase height and wrap labels; it never clips state or removes actions.

**The One Path Rule.** Each Operate surface presents one dominant reading order and one visually strongest next action.

## Elevation & Depth

Depth is tonal. Saturated headers, dark plan fields, white cards, pale tracks, and one-pixel borders establish layers without ambient card shadows. Shadows are reserved for temporary overlays such as transient feedback; native platform surfaces use their standard elevation behavior.

**The Tonal Hierarchy Rule.** A permanent surface earns separation through color, border, or containment before shadow.

## Shapes

The form language is rounded but disciplined: 18px cards, 16px compact tiles, 12px action controls, 4px flags, and fully round pills, badges, circular actions, and step markers. Borders remain thin and low contrast. Repeated geometry communicates role: circles are compact destinations or sequence state; pills are status or short actions; rounded rectangles are task containers.

**The Shape Means Role Rule.** Preserve the circle, pill, control, and card roles across screens instead of choosing radii per element.

## Components

### Buttons
- **Shape:** Confident rounded rectangle for primary task actions; pill for short row actions; circle plus visible label for compact dashboard destinations.
- **Primary:** The active Language accent with white 800-weight text and at least the native minimum touch target.
- **Press / Focus:** Restrained scale or opacity feedback on native, a visible focus treatment on web, and an immediate state change when reduced motion is active.
- **Disabled:** Preserve the label, expose disabled accessibility state, remove badges, and reduce prominence without hiding the control.

### Cards / Containers
- **Corner Style:** Consistent 18px cards with clipped progress tracks where needed.
- **Background:** White for Catalog and content; deep Language field for prioritized daily work.
- **Shadow Strategy:** Tonal and bordered at rest.
- **Border:** One-pixel Mist Border on white cards.
- **Internal Padding:** 18px for task cards, 12-16px for rows and headers.

### Language Header
The Language header is the strongest identity field. It uses the active Language gradient, white title and iconography, a visible current flag, concise learner state, and controls that remain inside the safe area.

### Progress
Progress tracks are pale and quiet; fills use the active Language soft color. Done, active, and pending states differ by fill, border, symbol, label weight, and accessibility state rather than color alone.

### Status Badges
Badges are small, high-contrast count pills attached to the control they qualify. Gold is reserved for due Review work; red is reserved for pending mistakes.

## Do's and Don'ts

### Do:
- **Do** keep Louisiana French and Kouri-Vini structurally identical while swapping the complete semantic palette.
- **Do** derive visible progress and status from real Learner Progress and Catalog data.
- **Do** use system typography, safe-area insets, native touch targets, and platform navigation behavior.
- **Do** keep labels visible beside or beneath unfamiliar icons.
- **Do** preserve the bundled flags, pelican, and second-line artwork at deliberate identity moments.

### Don't:
- **Don't** let several full-width secondary actions compete with the next learning action.
- **Don't** use shadows to compensate for weak hierarchy.
- **Don't** use color as the only signal for completion, availability, expansion, or error.
- **Don't** stretch the phone hierarchy into a wide multi-column web dashboard.
- **Don't** invent Catalog content, progress, badges, or learner claims for visual balance.
