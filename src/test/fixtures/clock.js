function localDate(month, day, hour) {
  return new Date(2026, month, day, hour, 0, 0);
}

export const clock = Object.freeze({
  studyDay: () => localDate(0, 10, 9),
  sameStudyDay: () => localDate(0, 10, 20),
  consecutiveStudyDay: () => localDate(0, 11, 9),
  gapStudyDay: () => localDate(0, 13, 9),
  reviewStart: () => localDate(0, 10, 9),
  pastDue: () => localDate(0, 11, 9),
  dueNow: () => localDate(0, 12, 9),
  futureDue: () => localDate(0, 18, 9),
  lessonCompletion: () => localDate(0, 15, 12),
  localCalendarLateEvening: () => new Date(2026, 2, 5, 23, 30, 0)
});
