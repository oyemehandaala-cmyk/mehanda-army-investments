import assert from 'node:assert/strict';
import test from 'node:test';
import { formatLocalDate, formatLocalTime } from '../src/lib/localDateTime.js';
import {
  createSessionInactivityTimer,
  INACTIVITY_LIMIT_MS,
  WARNING_LEAD_TIME_MS,
} from '../src/lib/sessionReminder.js';

class FakeEventTarget {
  listeners = new Map();

  addEventListener(name, listener) {
    const listeners = this.listeners.get(name) || new Set();
    listeners.add(listener);
    this.listeners.set(name, listeners);
  }

  removeEventListener(name, listener) {
    this.listeners.get(name)?.delete(listener);
  }

  dispatch(name, target = null) {
    this.listeners.get(name)?.forEach((listener) => listener({ target }));
  }
}

function createFakeScheduler() {
  let currentTime = 0;
  let nextId = 0;
  const timers = new Map();

  return {
    now: () => currentTime,
    schedule(callback, delay) {
      const id = ++nextId;
      timers.set(id, { callback, dueAt: currentTime + delay });
      return id;
    },
    cancel(id) {
      timers.delete(id);
    },
    advance(duration) {
      const targetTime = currentTime + duration;
      while (true) {
        const next = [...timers.entries()]
          .filter(([, timer]) => timer.dueAt <= targetTime)
          .sort((left, right) => left[1].dueAt - right[1].dueAt)[0];
        if (!next) break;
        const [id, timer] = next;
        timers.delete(id);
        currentTime = timer.dueAt;
        timer.callback();
      }
      currentTime = targetTime;
    },
    pendingCount: () => timers.size,
  };
}

function createTimerHarness() {
  const scheduler = createFakeScheduler();
  const documentTarget = new FakeEventTarget();
  const windowTarget = new FakeEventTarget();
  const stages = ['active'];
  const timer = createSessionInactivityTimer({
    onStageChange: (stage) => stages.push(stage),
    documentTarget,
    windowTarget,
    now: scheduler.now,
    schedule: scheduler.schedule,
    cancel: scheduler.cancel,
  });
  return { scheduler, documentTarget, windowTarget, stages, timer };
}

test('local clock formatting uses DD/MM/YYYY and 12-hour time with seconds', () => {
  const date = new Date(2026, 0, 9, 13, 5, 7);
  assert.equal(formatLocalDate(date), '09/01/2026');
  assert.match(formatLocalTime(date), /1?:05:07\s?[AP]M/i);
});

test('inactivity timer warns after 14 minutes and expires at 15 minutes', () => {
  const { scheduler, stages } = createTimerHarness();

  scheduler.advance(INACTIVITY_LIMIT_MS - WARNING_LEAD_TIME_MS);
  assert.deepEqual(stages, ['active', 'warning']);

  scheduler.advance(WARNING_LEAD_TIME_MS - 1);
  assert.equal(stages.at(-1), 'warning');
  scheduler.advance(1);
  assert.deepEqual(stages, ['active', 'warning', 'expired']);
});

test('click, typing, scrolling, and browser navigation reset inactivity', () => {
  const { scheduler, documentTarget, windowTarget, stages } = createTimerHarness();

  scheduler.advance(13 * 60 * 1000);
  documentTarget.dispatch('click');
  scheduler.advance(13 * 60 * 1000);
  documentTarget.dispatch('input');
  scheduler.advance(13 * 60 * 1000);
  documentTarget.dispatch('scroll');
  scheduler.advance(13 * 60 * 1000);
  windowTarget.dispatch('popstate');
  scheduler.advance(INACTIVITY_LIMIT_MS - WARNING_LEAD_TIME_MS - 1);
  assert.equal(stages.at(-1), 'active');
  scheduler.advance(1);
  assert.equal(stages.at(-1), 'warning');
});

test('reminder controls do not dismiss themselves through activity events', () => {
  const { scheduler, documentTarget, stages } = createTimerHarness();
  const reminderTarget = {
    nodeType: 1,
    closest: (selector) => selector === '[data-session-reminder]' ? {} : null,
  };

  scheduler.advance(INACTIVITY_LIMIT_MS - WARNING_LEAD_TIME_MS);
  documentTarget.dispatch('click', reminderTarget);
  scheduler.advance(WARNING_LEAD_TIME_MS);
  assert.deepEqual(stages, ['active', 'warning', 'expired']);
});

test('continue browsing restarts the full timer, and cleanup removes listeners', () => {
  const { scheduler, documentTarget, stages, timer } = createTimerHarness();

  scheduler.advance(INACTIVITY_LIMIT_MS);
  assert.equal(stages.at(-1), 'expired');
  timer.resume();
  assert.equal(stages.at(-1), 'active');
  scheduler.advance(INACTIVITY_LIMIT_MS - WARNING_LEAD_TIME_MS);
  assert.equal(stages.at(-1), 'warning');

  timer.stop();
  assert.equal(scheduler.pendingCount(), 0);
  documentTarget.dispatch('click');
  assert.equal(stages.at(-1), 'warning');
});
