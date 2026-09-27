import { describe, expect, it, vi } from "vitest";
import {
  OperationTimeoutError,
  resilientRead,
  safeRemoteErrorMessage,
  withTimeout,
} from "./network-resilience";

describe("network resilience", () => {
  it("limits a stalled operation", async () => {
    await expect(withTimeout(new Promise(() => undefined), 5)).rejects.toBeInstanceOf(OperationTimeoutError);
  });

  it("retries transient reads a bounded number of times", async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error("network unavailable"))
      .mockResolvedValue({ data: [1], error: null });

    await expect(resilientRead(operation, { retryDelayMs: 0 })).resolves.toEqual({ data: [1], error: null });
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("does not retry a non-transient database response", async () => {
    const result = { data: null, error: { message: "permission denied" } };
    const operation = vi.fn().mockResolvedValue(result);

    await expect(resilientRead(operation)).resolves.toBe(result);
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("never exposes the original technical error to the user", () => {
    expect(safeRemoteErrorMessage(new Error("token=private network error"))).not.toContain("private");
  });
});
