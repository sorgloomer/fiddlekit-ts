import { AsyncLocalStorage } from "node:async_hooks";
import { MISSING, PersistentMap } from "./PersistentMap";

export interface IAsyncLocal<T> {
  getStore(): T | undefined;

  enterWith(store: T): void;

  run<R>(store: T, callback: (...args: any[]) => R, ...args: any[]): R;

  exit<R>(callback: (...args: any[]) => R, ...args: any[]): R;
}

export class TrieAsyncLocal<T> implements IAsyncLocal<T> {
  public readonly _hash: number = nextKey();

  public constructor(public readonly root: RootStorage = getGlobalRootStorage()) {
  }

  getStore(): T | undefined {
    const value = this.root.getStore()?.get(this) as undefined | MISSING | T;
    if (value === MISSING) {
      return undefined;
    }
    return value;
  }

  enterWith(store: T) {
    const { root } = this;
    const storeMap = getOrCreateStoreMap(root).copy();
    storeMap.set(this, store);
    root.enterWith(storeMap);
  }

  run<R>(store: T, callback: (...args: any[]) => R, ...args: any[]): R {
    const { root } = this;
    const storeMap = getOrCreateStoreMap(root).copy();
    storeMap.set(this, store);
    return root.run(storeMap, callback, ...args);
  }

  exit<R>(callback: (...args: any[]) => R, ...args: any[]): R {
    const { root } = this;
    let storeMap = root.getStore();
    if (storeMap === undefined) {
      return callback(...args);
    }
    storeMap = storeMap.copy();
    storeMap.delete(this);
    return root.run(storeMap, callback, ...args);
  }
}

type RootStorage = IAsyncLocal<PersistentMap<TrieAsyncLocal<unknown>, unknown>>;
let globalRootStorage: RootStorage | undefined = undefined;

function getGlobalRootStorage(): RootStorage {
  if (globalRootStorage !== undefined) {
    return globalRootStorage;
  }
  return globalRootStorage = new AsyncLocalStorage<PersistentMap<TrieAsyncLocal<unknown>, unknown>>();
}

let keyCounter = 0;

function nextKey(): number {
  keyCounter = (keyCounter + 1658573183) | 0;
  return keyCounter;
}

function getOrCreateStoreMap(rootStorage: RootStorage) {
  return rootStorage.getStore() ?? new PersistentMap<TrieAsyncLocal<unknown>, unknown>(hashfn);
}

function hashfn(item: TrieAsyncLocal<unknown>): number {
  return item._hash;
}
