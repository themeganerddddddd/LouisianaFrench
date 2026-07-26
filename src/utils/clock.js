let clockSource = null;

export function getNow() {
  if (clockSource) return clockSource();
  return new Date();
}

export const __test = {
  setClockSource(fn) {
    clockSource = fn;
  },
  reset() {
    clockSource = null;
  }
};
