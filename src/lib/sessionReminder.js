export const INACTIVITY_LIMIT_MS = 15 * 60 * 1000;
export const WARNING_LEAD_TIME_MS = 60 * 1000;

const ACTIVITY_EVENTS = ['click', 'pointerdown', 'keydown', 'input', 'scroll', 'touchstart', 'wheel'];
const NAVIGATION_EVENTS = ['hashchange', 'popstate', 'pageshow'];

export function createSessionInactivityTimer({
  onStageChange,
  documentTarget = typeof document === 'undefined' ? null : document,
  windowTarget = typeof window === 'undefined' ? null : window,
  now = Date.now,
  schedule = setTimeout,
  cancel = clearTimeout,
  inactivityLimitMs = INACTIVITY_LIMIT_MS,
  warningLeadTimeMs = WARNING_LEAD_TIME_MS,
} = {}) {
  if (typeof onStageChange !== 'function') {
    throw new TypeError('onStageChange must be a function.');
  }

  let stage = 'active';
  let idleSince = now();
  let timer = null;
  let stopped = false;

  const setStage = (nextStage) => {
    if (stage === nextStage) return;
    stage = nextStage;
    onStageChange(nextStage);
  };

  const clearTimer = () => {
    if (timer !== null) cancel(timer);
    timer = null;
  };

  const scheduleNextStage = () => {
    clearTimer();
    if (stopped || stage === 'expired') return;

    const elapsed = Math.max(0, now() - idleSince);
    const remaining = inactivityLimitMs - elapsed;
    const delay = elapsed < inactivityLimitMs - warningLeadTimeMs
      ? remaining - warningLeadTimeMs
      : remaining;

    timer = schedule(() => {
      timer = null;
      const currentElapsed = Math.max(0, now() - idleSince);
      if (currentElapsed >= inactivityLimitMs) {
        setStage('expired');
        return;
      }
      if (currentElapsed >= inactivityLimitMs - warningLeadTimeMs) {
        setStage('warning');
      }
      scheduleNextStage();
    }, Math.max(0, delay));
  };

  const isReminderInteraction = (target) => {
    const element = target?.nodeType === 1 ? target : target?.parentElement;
    return Boolean(element?.closest?.('[data-session-reminder]'));
  };

  const recordActivity = (event) => {
    if (stage === 'expired' || isReminderInteraction(event?.target)) return;
    idleSince = now();
    setStage('active');
    scheduleNextStage();
  };

  const resume = () => {
    if (stopped) return;
    idleSince = now();
    setStage('active');
    scheduleNextStage();
  };

  const stop = () => {
    stopped = true;
    clearTimer();
    ACTIVITY_EVENTS.forEach((eventName) => {
      documentTarget?.removeEventListener(eventName, recordActivity, true);
    });
    NAVIGATION_EVENTS.forEach((eventName) => {
      windowTarget?.removeEventListener(eventName, recordActivity);
    });
  };

  ACTIVITY_EVENTS.forEach((eventName) => {
    documentTarget?.addEventListener(eventName, recordActivity, true);
  });
  NAVIGATION_EVENTS.forEach((eventName) => {
    windowTarget?.addEventListener(eventName, recordActivity);
  });
  scheduleNextStage();

  return { resume, stop };
}
