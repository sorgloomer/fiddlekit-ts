import { expect, test } from "vitest";
import { isPromiseLike } from "./utils";

test("isPromiseLike", () => {
  expect(isPromiseLike(Promise.resolve())).toBe(true);
  expect(isPromiseLike({
    then: () => {
    }
  })).toBe(true);
  expect(isPromiseLike("foo")).toBe(false);
  expect(isPromiseLike({})).toBe(false);
  expect(isPromiseLike({ then: "" })).toBe(false);
});
