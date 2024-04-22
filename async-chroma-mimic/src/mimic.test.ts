import { makeMimic } from "./mimic";
import { describe, expect, test } from "vitest";
import { OrAsync } from "./utils.types";
import { sleep } from "../test/utils";

describe("makeMimic", () => {
  const greet = makeMimic(function* (getName: OrAsync<() => string>) {
    return `Welcome ${yield getName()}`;
  });

  test("works with sync functions", () => {
    const result = greet(() => "Sync");
    expect(result).toBe("Welcome Sync");
  });

  test("works with async functions", async () => {
    const result = greet(async () => "Async");
    expect(result).toBeInstanceOf(Promise);
    expect(await result).toBe("Welcome Async");
  });

  test("mimics await behavior #1", async () => {
    const order: string[] = [];
    const fn = makeMimic(function* (inner: () => Promise<void>) {
      try {
        return inner(); // missing yield, analogous to missing await
      } finally {
        order.push("finally");
      }
    });

    await fn(async () => {
      await sleep(1);
      order.push("inner");
    });
    expect(order).toEqual(["finally", "inner"]);
  });

  test("mimics await behavior #2", async () => {
    const order: string[] = [];
    const fn = makeMimic(function* (inner: () => Promise<void>) {
      try {
        return (yield inner()) as string;
      } finally {
        order.push("finally");
      }
    });
    await fn(async () => {
      await sleep(1);
      order.push("inner");
    });
    expect(order).toEqual(["inner", "finally"]);
  });

});
