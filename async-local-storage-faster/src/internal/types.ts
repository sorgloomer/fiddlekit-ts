import { MISSING } from "../PersistentMap";
import { Item } from "./item";

export interface INode<K, V> {
  readonly size: number;

  get(key: K, keyHash: KeyHash, keyHashShift: number): Item<K, V> | undefined;

  set(item: Item<K, V | MISSING>, keyHashShift: number, owner: symbol): INode<K, V>;

  items(): IterableIterator<Item<K, V>>;
}

export type KeyHash = number;
export type HashFn<T> = (value: T) => number;
