import { describe, expect, it } from "vitest";
import { localAccountStorageKeys, STORAGE_KEY } from "./local-store";

describe("local account cleanup", () => {
  it("removes account state, last tab and the case-normalized notification marker", () => {
    expect(localAccountStorageKeys("Person@Example.com")).toEqual([
      STORAGE_KEY,
      "laburapp:last-tab",
      "laburapp:seen-requests:person@example.com",
    ]);
  });

  it("does not invent a notification key without an email", () => {
    expect(localAccountStorageKeys()).toEqual([STORAGE_KEY, "laburapp:last-tab"]);
  });
});
