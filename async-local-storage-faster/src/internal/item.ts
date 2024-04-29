import { KeyHash } from "./types";
import { MISSING } from "./missing";

export const UNUSED = Symbol("UNUSED");
export type UNUSED = typeof UNUSED;

export class Item<K, V> {
  // Huge hack to enable returning a boolean upon delete, via mutable input parameters, to avoid extra allocations
  public previousValue: V | MISSING | UNUSED = UNUSED;

  public constructor(
    public readonly key: K,
    public readonly keyHash: KeyHash,
    public readonly value: V,
  ) {
  }
}
