export const TBOY_TAP_TARGET = 10;
export const TBOY_TAP_RESET_MS = 2500;

export function registerTBoyTap(
  state,
  {
    target = TBOY_TAP_TARGET,
    resetMs = TBOY_TAP_RESET_MS,
    now = Date.now()
  } = {}
) {
  const timestamp = typeof now === 'function' ? now() : now;
  let count = state?.count ?? 0;
  const lastTapAt = state?.lastTapAt ?? 0;

  if (lastTapAt && timestamp - lastTapAt > resetMs) {
    count = 0;
  }

  count += 1;

  if (count >= target) {
    return {
      state: { count: 0, lastTapAt: 0 },
      unlocked: true
    };
  }

  return {
    state: { count, lastTapAt: timestamp },
    unlocked: false
  };
}

export function formatActivityNavLabel(activity, index) {
  const type = String(activity?.type || 'activity').replace(/_/g, ' ');
  const headline =
    activity?.target ||
    activity?.english ||
    activity?.prompt ||
    activity?.answerDisplay ||
    'Activity';

  return `${index + 1}. ${type} — ${headline}`;
}
