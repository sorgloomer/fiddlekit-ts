import { Action, Hashed, MapOps, opsMap, opsPersistentMap } from "../src/PersistentMap.random.test";
import { generateArray, lazy, makeHashSequence, makeValueSequence, MockValueObj, randint, sample } from "./utils";
import { bench, describe } from "vitest";
import { PersistentMap } from "../src/PersistentMap";

// TODO: take a  few real nestjs applications and compare these metrics to see if it resembles reality
let scenario = lazy(() => new Scenario({
  mapCount: 5, // parallelism
  keyCount: 50, // number of services
  cycleCount: 100, // longitude of simulation
  setChance: 0.9, // keep most of them assigned
  readCount: 5, // scoped accesses per request
  updateCount: 2, // request scope object count, the request and maybe a transaction
}));

describe("Benchmark PersistentMap", () => {
  bench("Map", () => {
    testerMapNorm.run();
  }, {
    setup: () => {
      testerMapNorm = new Tester(scenario(), opsMap());
    },
  });

  bench("PersistentMap", () => {
    testerMapPers.run();
  }, {
    setup: () => {
      testerMapPers = new Tester(scenario(), opsPersistentMap());
    },
  });

  let testerMapNorm: Tester<Map<Hashed, MockValueObj>>;
  let testerMapPers: Tester<PersistentMap<Hashed, MockValueObj>>;
});


class Tester<T> {
  public maps: T[];

  constructor(
    public scenario: Scenario,
    public ops: MapOps<T>,
  ) {
    this.maps = generateArray(scenario.mapCount, () => ops.make());
  }

  run() {
    const { actions } = this.scenario;
    const { set, del, copy, get } = this.ops;
    const { maps } = this;
    for (const action of actions) {
      switch (action.type) {
        case "copy":
          maps[action.dst] = copy(maps[action.src]);
          break;
        case "set":
          set(maps[action.dst], action.key, action.value);
          break;
        case "del":
          del(maps[action.dst], action.key);
          break;
        case "get":
          get(maps[action.dst], action.key);
          break;
      }
    }
    this.maps = maps;
  }
}

export class Scenario {
  public readonly actions: Action[];
  public readonly keys: Hashed[];
  public mapCount: number;

  constructor({
    mapCount,
    keyCount,
    setupCount = keyCount,
    cycleCount,
    updateCount,
    setChance,
    readCount,
  }: ScenarioParams) {
    const nextHash = makeHashSequence();
    const keys = generateArray(keyCount, i => ({ hash: nextHash(), i }));
    const nextValue = makeValueSequence();
    const actions: Action[] = [];
    for (let i = 0; i < setupCount; i++) {
      actions.push({
        type: "set",
        dst: 0,
        key: keys[i],
        value: nextValue(),
      });
    }

    for (let i = 1; i < mapCount; i++) {
      actions.push({
        type: "copy",
        dst: i,
        src: 0,
      });
    }

    for (let cycle = 0; cycle < cycleCount; cycle++) {
      const dst = randint(mapCount);
      actions.push({ type: "copy", src: randint(mapCount), dst });
      for (let i = 0; i < updateCount; i++) {
        actions.push((() => {
          if (Math.random() < setChance) {
            return { type: "set", dst, key: sample(keys), value: nextValue() };
          } else {
            return { type: "del", dst, key: sample(keys) };
          }
        })());
      }
      for (let i = 0; i < readCount; i++) {
        actions.push({ type: "get", dst, key: sample(keys) });
      }
    }
    this.actions = actions;
    this.keys = keys;
    this.mapCount = mapCount;
  }
}

type ScenarioParams = {
  mapCount: number,
  keyCount: number,
  setupCount?: number,
  cycleCount: number,
  updateCount: number,
  setChance: number,
  readCount: number,
};
