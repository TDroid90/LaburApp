import { afterEach, describe, expect, it, vi } from "vitest";
import { createRefreshScheduler } from "./request-sync-scheduler";

describe("request refresh scheduler", () => {
  afterEach(() => vi.useRealTimers());

  it("coalesces rapid Realtime events into one refresh", () => {
    vi.useFakeTimers();
    const refresh = vi.fn();
    const scheduler = createRefreshScheduler(refresh, 250);
    scheduler.schedule();
    scheduler.schedule();
    scheduler.schedule();
    vi.advanceTimersByTime(249);
    expect(refresh).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("cancels pending work during cleanup", () => {
    vi.useFakeTimers();
    const refresh = vi.fn();
    const scheduler = createRefreshScheduler(refresh, 250);
    scheduler.schedule();
    scheduler.dispose();
    vi.runAllTimers();
    expect(refresh).not.toHaveBeenCalled();
  });
});
