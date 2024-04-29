import { describe, expect, test } from "vitest";
import { PersistentMap } from "./PersistentMap";

function makeMap() {
  return new PersistentMap<Hashed, unknown>(o => o.hash);
}

describe("PersistentMap", () => {
  test("setting a value", async () => {
    const m0 = makeMap();
    const keys = [{ hash: 2 }];
    fillWithRandomKeys(m0, 500);
    m0.set(keys[0], "value m 0");
    fillWithRandomKeys(m0, 500);
    expect(m0.get(keys[0])).toBe("value m 0");
    m0.set(keys[0], "value m 1");
    expect(m0.get(keys[0])).toBe("value m 1");
    fillWithRandomKeys(m0, 500);
    expect(m0.get(keys[0])).toBe("value m 1");
  });

  test("setting values after copy", async () => {
    const m0 = makeMap();
    const keys = [1, 2, 3, 4, 5].map(hash => ({ hash }));

    m0.set(keys[0], "value 0 0");
    m0.set(keys[1], "value 0 1");
    m0.set(keys[2], "value 0 2");
    const m1 = m0.copy();
    m1.set(keys[2], "value 1 2");
    m1.set(keys[3], "value 1 3");

    expect(m0.get(keys[0])).toBe("value 0 0");
    expect(m0.get(keys[1])).toBe("value 0 1");
    expect(m0.get(keys[2])).toBe("value 0 2");
    expect(m0.get(keys[3])).toBe(undefined);
    expect(m0.get(keys[4])).toBe(undefined);
    expect(m1.get(keys[0])).toBe("value 0 0");
    expect(m1.get(keys[1])).toBe("value 0 1");
    expect(m1.get(keys[2])).toBe("value 1 2");
    expect(m1.get(keys[3])).toBe("value 1 3");
    expect(m1.get(keys[4])).toBe(undefined);
  });

  test("deleting values after copy", async () => {
    const m0 = new PersistentMap<Hashed, unknown>(o => o.hash);
    const keys = [1, 2, 3, 4, 5].map(hash => ({ hash }));
    m0.set(keys[0], "value 0 0");
    m0.set(keys[1], "value 0 1");
    m0.set(keys[2], "value 0 2");
    const m1 = m0.copy();
    m1.delete(keys[1]);
    m1.delete(keys[3]);
    expect(m0.get(keys[0])).toBe("value 0 0");
    expect(m0.get(keys[1])).toBe("value 0 1");
    expect(m0.get(keys[2])).toBe("value 0 2");
    expect(m0.get(keys[3])).toBe(undefined);
    expect(m0.get(keys[4])).toBe(undefined);
    expect(m1.get(keys[0])).toBe("value 0 0");
    expect(m1.get(keys[1])).toBe(undefined);
    expect(m1.get(keys[2])).toBe("value 0 2");
    expect(m1.get(keys[3])).toBe(undefined);
    expect(m1.get(keys[4])).toBe(undefined);
  });

  test("resolves hash collision small", async () => {
    const m0 = new PersistentMap<Hashed, unknown>(o => o.hash);
    const keys = [1, 1, 1, 1].map(hash => ({ hash }));
    fillWithRandomKeys(m0, 100);
    m0.set(keys[0], "value 0");
    m0.set(keys[1], "value 1");
    m0.set(keys[2], "value 2");
    expect(m0.get(keys[0])).toBe("value 0");
    expect(m0.get(keys[1])).toBe("value 1");
    expect(m0.get(keys[2])).toBe("value 2");
    expect(m0.get(keys[3])).toBe(undefined);
  });

  test("resolves hash collision big", async () => {
    const m0 = new PersistentMap<Hashed, unknown>(o => o.hash);
    const keys: (Hashed & { index: number })[] = [];
    for (let i = 0; i < 400; i++) {
      keys[i] = { hash: 123, index: i };
    }
    fillWithRandomKeys(m0, 400);
    for (const key of keys) {
      m0.set(key, `value ${key.index}`);
    }
    for (const key of keys) {
      expect(m0.get(key)).toBe(`value ${key.index}`);
    }
  });
});

function randomKey() {
  return { hash: ((Math.random() * (1 << 32)) | 0) };
}

function fillWithRandomKeys(m0: PersistentMap<Hashed, unknown>, count: number) {
  for (let i = 0; i < count; i++) {
    m0.set(randomKey(), "value R");
  }
}

type Hashed = { hash: number };

