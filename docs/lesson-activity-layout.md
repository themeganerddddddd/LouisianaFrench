# Lesson Activity layout

Lesson and Daily Review render each Activity inside a vertical scroll shell (`testID="activity-scroll"`).

## Reachable controls

The scroll shell must be height-bounded (`flex: 1`) inside the screen flex chain (`lesson-activity-shell` in Lesson Runner, or the Daily Review `inner` column). Without that bound, a React Native `ScrollView` grows to its content height, the parent clips the bottom, and controls such as **Continue** on a tall New-word intro can sit below the fold with no scroll range — the failure reported on Galaxy S24 for Kouri-Vini Unit 1 Part 2 (#324).

Primary actions for an Activity stay inside this scroll shell so a swipe can reach them when content exceeds the viewport.
