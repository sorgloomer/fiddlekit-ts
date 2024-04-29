import { describe, test } from "vitest";
import * as fs from "node:fs/promises";
import { MISSING, PersistentMap } from "./PersistentMap";
import {
  enumerate,
  generateArray,
  makeHashSequence,
  makeValueSequence, MockValueObj,
  randint,
  replacer,
  sample
} from "../test/utils";

const DEBUG = true;

describe("PersistentMap", () => {

  test("just add and copy", async () => {
    const runner = new BatchRunner(1);
    const { nextValue, keys } = setupKeyAndValueSource({ keyCount: 50 });

    for (const key of keys) {
      runner.runnerPers.runCopy(0, 0);
      runner.runSet(0, key, nextValue());
    }
    await runner.expectAllMapsEqual();
  });

  for (const copy of [false, true]) {
    test(`a random sequence of operations on a map with copy ${copy}`, { repeats: 1 }, async () => {

      const runner = new BatchRunner(1);
      const { nextValue, keys } = setupKeyAndValueSource({ keyCount: 40 });

      async function runEdge(setRatio: number) {
        const count = keys.length * 2;
        const peekAt = keys.length;
        for (let i = 0; i < count; i++) {
          if (Math.random() < setRatio) {
            runner.runSet(0, sample(keys), nextValue());
          } else {
            runner.runDel(0, sample(keys));
          }
          if (i === peekAt) {
            await runner.expectAllMapsEqual();
          }
          await runner.expectAllMapsEqual();
          if (copy) {
            runner.runnerPers.runCopy(0, 0);
          }
          await runner.expectAllMapsEqual();
        }
        await runner.expectAllMapsEqual();
      }

      for (let i = 0; i < 5; i++) {
        await runEdge(0.9);
        await runEdge(0.1);
      }
      await runner.expectAllMapsEqual();
    });
  }


  test(`a random sequence of operations on maps`, async () => {
    const { nextValue, keys } = setupKeyAndValueSource({ keyCount: 1000 });

    const MAP_COUNT = 10;

    const runner = new BatchRunner(MAP_COUNT);

    for (let i = 0; i < 1000; i++) {
      const r = Math.random();
      if (r < 0.01) {
        runner.runCopy(randint(MAP_COUNT), randint(MAP_COUNT));
      } else if (r < 0.2) {
        runner.runGet(randint(MAP_COUNT), sample(keys));
      } else if (r < 0.8) {
        runner.runSet(randint(MAP_COUNT), sample(keys), nextValue());
      } else {
        runner.runDel(randint(MAP_COUNT), sample(keys));
      }
      if ((i % 20) === 0) {
        runner.expectAllMapsEqual(keys);
      }
    }
  });

  test("a random sequence of operations on a set of maps", async () => {
    const runnerNormal = new ActionRunnerOne(opsMap());
    const runnerPersistent = new ActionRunnerOne(opsPersistentMap());
    const { nextValue, keys } = setupKeyAndValueSource({ keyCount: 50 });

    function* generateActions(): IterableIterator<{ action: Action, compare?: boolean }> {
      const MAX_MAP_COUNT = 10;
      for (let j = 1; j < MAX_MAP_COUNT; j++) {
        for (let i = 0; i < 10; i++) {
          yield { action: { type: "set", dst: 0, key: sample(keys), value: nextValue() } };
        }
        yield { action: { type: "copy", dst: j, src: 0 } };
      }

      for (let j = 0; j < 5; j++) {
        for (let i = 0; i < 5; i++) {
          if (Math.random() < 0.75) {
            yield { action: { type: "set", dst: randint(3), key: sample(keys), value: nextValue() } };
          } else {
            yield { action: { type: "del", dst: randint(3), key: sample(keys) } };
          }
        }
        yield { action: { type: "copy", dst: randint(3), src: randint(3) } };
      }

      for (let j = 0; j < 5; j++) {
        for (let i = 0; i < 5; i++) {
          if (Math.random() < 0.75) {
            yield { action: { type: "set", dst: randint(MAX_MAP_COUNT), key: sample(keys), value: nextValue() } };
          } else {
            yield { action: { type: "del", dst: randint(MAX_MAP_COUNT), key: sample(keys) } };
          }
        }
        yield { action: { type: "copy", dst: randint(MAX_MAP_COUNT), src: randint(MAX_MAP_COUNT) } };
      }
    }

    const compareTester = new BatchTester(
      runnerNormal,
      runnerPersistent,
    );
    await compareTester.testWithActions(generateActions());
  });
});

class BatchTester {
  public logs: string[] = [];
  public steps: [string[], string[]][] = [];
  public counter = 0;

  public constructor(
    public testerNormal: ActionRunnerOne<Map<Hashed, MockValueObj>>,
    public testerPersistent: ActionRunnerOne<PersistentMap<Hashed, MockValueObj>>,
  ) {
  }

  async testWithActions(generateActions: IterableIterator<{
    action: Action;
    compare?: boolean
  }>) {
    for (const { action, compare } of generateActions) {
      this.testerNormal.testOne(action);
      this.testerPersistent.testOne(action);
      if (DEBUG) {
        this.logs.push(JSON.stringify([++this.counter, action]));
        this.steps.push([
          this.testerNormal.maps.map(m => JSON.stringify(m, replacer, 2)),
          this.testerPersistent.maps.map(m => JSON.stringify(m, replacer, 2))
        ]);
        while (this.steps.length > 10) {
          this.steps.shift();
        }
      }
      try {
        if (compare ?? true) {
          expectEqualRunners(this.testerNormal, this.testerPersistent, this.logs);
        }
      } catch (e: any) {

        if (DEBUG && (e instanceof ErrorAtMapIndex)) {
          await fs.mkdir("temp", { recursive: true });
          await fs.writeFile("temp/logs.json", this.logs.map(x => x + "\n").join(""));
          if (this.steps.length > 0) {
            await fs.writeFile("temp/map-0-new.json", this.steps.at(-1)?.[0][e.index] ?? "");
            await fs.writeFile("temp/map-1-new.json", this.steps.at(-1)?.[1][e.index] ?? "");
          }
          if (this.steps.length > 1) {
            await fs.writeFile("temp/map-0-old.json", this.steps.at(-2)?.[0][e.index] ?? "");
            await fs.writeFile("temp/map-1-old.json", this.steps.at(-2)?.[1][e.index] ?? "");
          }
        }
        throw e;
      }
    }
  }
}

export type Hashed = { hash: number };

export type Action =
  | { type: "copy", src: number, dst: number }
  | { type: "set", dst: number, key: Hashed, value: MockValueObj }
  | { type: "del", dst: number, key: Hashed }
  | { type: "get", dst: number, key: Hashed }
  ;

export type MapOps<TMap> = {
  name: string;
  make(): TMap;
  copy(obj: TMap): TMap;
  size(obj: TMap): number;
  set(obj: TMap, k: Hashed, v: MockValueObj): void;
  del(obj: TMap, k: Hashed): void;
  get(obj: TMap, k: Hashed): MockValueObj | MISSING;
}

export class BatchRunner {
  public runnerNorm: ActionRunnerOne<Map<Hashed, MockValueObj>>;
  public runnerPers: ActionRunnerOne<PersistentMap<Hashed, MockValueObj>>;
  public runners: [ActionRunnerOne<Map<Hashed, MockValueObj>>, ActionRunnerOne<PersistentMap<Hashed, MockValueObj>>];
  public samples: string[][] = [];
  public log: string[] = [];

  public constructor(initialMapCount: number) {
    this.runnerNorm = new ActionRunnerOne(opsMap(), initialMapCount);
    this.runnerPers = new ActionRunnerOne(opsPersistentMap(), initialMapCount);
    this.runners = [this.runnerNorm, this.runnerPers];
  }

  async expectAllMapsEqual(keys?: Hashed[]) {
    this.debugSample();
    try {
      const mapCount = this.runnerNorm.maps.length;
      if (mapCount !== this.runnerPers.maps.length) {
        throw new Error(`Map lengths differ: ${[this.runnerNorm.maps.length, this.runnerPers.maps.length]}`);
      }
      for (let i = 0; i < mapCount; i++) {
        expectEqualMaps(this.runnerNorm.maps[i], this.runnerPers.maps[i], keys);
      }
    } catch (e: any) {
      if (DEBUG) {
        await this.debugDump();
      }
      throw e;
    }
  }

  async debugDump() {
    await fs.mkdir("temp", { recursive: true });

    await fs.writeFile(`temp/logs.txt`, this.log.map(l => l + "\n").join(""));
    for (const [a1, i1] of enumerate(this.samples)) {
      for (const [a2, i2] of enumerate(a1)) {
        await fs.writeFile(`temp/map-${i2}-${i1}.json`, a2);
      }
    }
  }

  debugSample() {
    this.samples.push(
      this.runners.map(
        runner => JSON.stringify(runner.maps, replacer, 2)
      )
    );
    while (this.samples.length > 2) {
      this.samples.shift();
    }
  }

  _log(jsonMsg: unknown) {
    this.log.push(JSON.stringify(jsonMsg));
    while (this.log.length > 20) {
      this.log.shift();
    }
  }

  runCopy(dst: number, src: number) {
    this._log({ type: "copy", dst, src });
    for (const runner of this.runners) {
      runner.runCopy(dst, src);
    }
  }

  runSet(dst: number, key: Hashed, value: MockValueObj) {
    this._log({ type: "set", dst, key, value });
    return this.runners.map(runner => runner.runSet(dst, key, value));
  }

  runDel(dst: number, key: Hashed) {
    this._log({ type: "del", dst, key });
    return this.runners.map(runner => runner.runDel(dst, key));
  }

  runGet(dst: number, key: Hashed) {
    this._log({ type: "get", dst, key });
    return this.runners.map(runner => runner.runGet(dst, key));
  }
}

export class ActionRunnerOne<T> {
  public maps: T[];

  constructor(
    public ops: MapOps<T>,
    mapCount = 1
  ) {
    this.maps = generateArray(mapCount, () => ops.make());
  }

  runCopy(dst: number, src: number) {
    this.maps[dst] = this.ops.copy(this.maps[src]);
  }

  runSet(dst: number, key: Hashed, value: MockValueObj) {
    this.ops.set(this.maps[dst], key, value);
  }

  runDel(dst: number, key: Hashed) {
    this.ops.del(this.maps[dst], key);
  }

  runGet(dst: number, key: Hashed) {
    return this.ops.get(this.maps[dst], key);
  }

  testOne(action: Action) {
    switch (action.type) {
      case "copy":
        this.runCopy(action.dst, action.src);
        break;
      case "set":
        this.runSet(action.dst, action.key, action.value);
        break;
      case "del":
        this.runDel(action.dst, action.key);
        break;
      case "get":
        this.runGet(action.dst, action.key);
        break;
    }
  }
}

function setupKeyAndValueSource({ keyCount }: { keyCount: number }) {
  const nextHash = makeHashSequence();
  const nextValue = makeValueSequence();
  const keys = generateArray(keyCount, i => ({ hash: nextHash(), index: i }));
  return { nextValue, keys, nextHash };
}

class ErrorAtMapIndex extends Error {
  constructor(message: string, public readonly index: number) {
    super(message);
  }
}

function expectEqualRunners(
  t1: ActionRunnerOne<Map<Hashed, MockValueObj>>,
  t2: ActionRunnerOne<PersistentMap<Hashed, MockValueObj>>,
  logs: string[],
) {
  const mapCount = t1.maps.length;
  if (t2.maps.length !== mapCount) {
    throw new Error("Map count differs");
  }

  for (let i = 0; i < mapCount; i++) {
    if (t1.maps[i].size !== t2.maps[i].size) {
      if (DEBUG) {
        logs.push(JSON.stringify(["Difference size", i, t1.maps[i].size, t2.maps[i].size]));
      }
      throw new ErrorAtMapIndex(`Difference in map size ${JSON.stringify({
        i,
        sizeMap: t1.maps[i].size,
        sizePersistentMap: t2.maps[i].size
      })}`, i);
    }

    const diff = getDiffOfMaps(t1.maps[i], t2.maps[i]);
    if (diff !== undefined) {
      if (DEBUG) {
        logs.push(JSON.stringify(["Difference data", i, diff.key, diff.values[0], diff.values[1]]));
      }
      throw new ErrorAtMapIndex(`Difference in map data ${JSON.stringify({
        i,
        diff,
      })}`, i);
    }
  }
}

function expectEqualMaps<K, V>(
  map1: Map<K, V>,
  map2: PersistentMap<K, V>,
  keys?: K[],
): void {
  const diff = getDiffOfMaps(map1, map2, keys);
  if (diff !== undefined) {
    throw new Error(`Maps differ: ${JSON.stringify(diff)}`);
  }
}

function getDiffOfMaps<K, V>(
  map1: Map<K, V>,
  map2: PersistentMap<K, V>,
  keys?: K[],
): (undefined | {
  key: K,
  values: [V | MISSING, V | MISSING],
}) {
  if (keys === undefined) {
    const keySet = new Set<K>();
    for (const [k, v] of map1.entries()) {
      keySet.add(k);
    }
    for (const [k, v] of map2.entries()) {
      keySet.add(k);
    }
    keys = Array.from(keySet);
  }
  for (const key of keys) {
    const v1 = map1.has(key) ? map1.get(key)! : MISSING;
    const v2 = map2.get2(key);
    if (v1 !== v2) {
      return { key, values: [v1, v2] };
    }
  }
  return undefined;
}


export function opsMap(): MapOps<Map<Hashed, MockValueObj>> {
  return {
    name: "          Map",
    make: () => new Map<Hashed, MockValueObj>(),
    copy: obj => new Map(obj),
    size: obj => obj.size,
    set: (obj, key, value) => {
      obj.set(key, value);
    },
    del: (obj, key) => {
      obj.delete(key);
    },
    get: (obj, key) => obj.has(key) ? obj.get(key)! : MISSING,
  };
}

const makePersistentMap = () => new PersistentMap<Hashed, MockValueObj>(h => h.hash);

export function opsPersistentMap(): MapOps<PersistentMap<Hashed, MockValueObj>> {
  return {
    name: "PersistentMap",
    make: makePersistentMap,
    copy: obj => obj.copy(),
    size: obj => obj.size,
    set: (obj, key, value) => {
      obj.set(key, value);
    },
    del: (obj, key) => {
      obj.delete(key);
    },
    get: (obj, key) => obj.get2(key),
  };
}

