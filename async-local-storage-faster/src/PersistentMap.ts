import { HashFn, INode } from "./internal/types";
import { Item, UNUSED } from "./internal/item";
import { newEmptyNode } from "./internal/utils";
import { MISSING } from "./internal/missing";

const CACHE_ENABLED = true;

export interface CopiableMap<K, V> extends Iterable<[K, V]> {
  readonly size: number;

  copy(): CopiableMap<K, V>;

  get(key: K): V | undefined;

  get2(key: K): V | MISSING; // renamed to keep the interface somewhat compatible with Map

  set(key: K, value: V | MISSING): this;

  has(key: K): boolean;

  delete(key: K): boolean;

  [Symbol.iterator](): IterableIterator<[K, V]>;

  entries(): IterableIterator<[K, V]>;
}

export class PersistentMap<K, V> implements CopiableMap<K, V> {
  private _token: symbol = Symbol();

  private _root: INode<K, V>;
  private _cache: Map<K, Item<K, V>> = new Map();

  public constructor(
    public readonly hashfn: HashFn<K>,
    source?: Iterable<[K, V]>,
    root?: INode<K, V>,
  ) {
    if (root === undefined) {
      root = newEmptyNode(this._token);
    }
    this._root = root;
    if (source !== undefined) {
      for (const [k, v] of source) {
        this.set(k, v);
      }
    }
  }

  public get size(): number {
    return this._root.size;
  }

  copy(): PersistentMap<K, V> {
    const result = new PersistentMap(this.hashfn, undefined, this._root);
    this._token = Symbol(); // release ownership of all children
    return result;
  }

  get(key: K): V | undefined {
    const result = this._get(key);
    return result === MISSING ? undefined : result;
  }

  get2(key: K): V | MISSING {
    return this._get(key);
  }

  set(key: K, value: V | MISSING): this {
    const item = this._set(key, value);
    item.previousValue = UNUSED; // release for gc
    return this;
  }

  has(key: K): boolean {
    return this.get(key) !== MISSING;
  }

  delete(key: K): boolean {
    const item = this._set(key, MISSING);
    const result = item.previousValue !== MISSING;
    item.previousValue = UNUSED; // release for gc
    return result;
  }

  * entries(): IterableIterator<[K, V]> {
    for (const item of this._root.items()) {
      yield [item.key, item.value];
    }
  }

  declare [Symbol.iterator]: (this: this) => IterableIterator<[K, V]>;

  private _get(key: K): V | MISSING {
    const { _cache, _root } = this;
    if (CACHE_ENABLED) {
      const cached = _cache.get(key);
      if (cached !== undefined) {
        return cached.value;
      }
    }
    const item = _root.get(key, this.hashfn(key), 0);
    if (item === undefined) {
      return MISSING;
    }
    if (CACHE_ENABLED) {
      _cache.set(key, item);
    }
    return item.value;
  }

  private _set(key: K, value: V | MISSING): Item<K, V | MISSING> {
    const { _cache, _root } = this;

    const hash = this.hashfn(key);
    const item = new Item<K, V | MISSING>(key, hash, value);
    this._root = _root.set(item, 0, this._token);
    if (CACHE_ENABLED) {
      if (value === MISSING) {
        _cache.delete(key);
      } else {
        _cache.set(key, item as Item<K, V>);
      }
    }
    return item;
  }
}

const PersistentMapPrototype = PersistentMap.prototype;

Object.defineProperty(PersistentMapPrototype, Symbol.iterator, {
  configurable: true,
  enumerable: false,
  writable: true,
  value: PersistentMapPrototype.entries,
});

export type { HashFn };
export { MISSING };
