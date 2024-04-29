import { MISSING } from "../PersistentMap";
import { INode, KeyHash } from "./types";
import { Item } from "./item";
import { NODE_BAG_COLLAPSE_THRESHOLD, NODE_TRIE_BIT_COUNT, NODE_TRIE_BIT_MASK, NODE_TRIE_SIZE } from "./tunables";
import { newEmptyNode } from "./utils";
import { BagNode } from "./bag-node";

export class TrieNode<K, V> implements INode<K, V> {
  public size = 0;
  public nodes: (INode<K, V> | undefined)[] = new Array(NODE_TRIE_SIZE);

  constructor(
    public readonly token: unknown,
  ) {
  }

  get(key: K, keyHash: KeyHash, keyHashShift: number): Item<K, V> | undefined {
    keyHash |= 0;
    keyHashShift |= 0;
    const idx = (keyHash >>> keyHashShift) & NODE_TRIE_BIT_MASK;
    const child = this.nodes[idx];
    if (child === undefined) {
      return undefined;
    }
    return child.get(key, keyHash, (keyHashShift + NODE_TRIE_BIT_COUNT) | 0);
  }

  set(item: Item<K, V | MISSING>, keyHashShift: number, owner: symbol): INode<K, V> {
    keyHashShift |= 0;
    const keyHash = item.keyHash | 0;
    const { value, key } = item;
    const idx = (keyHash >>> keyHashShift) & NODE_TRIE_BIT_MASK;
    const { token: myToken, nodes: myNodes } = this;

    const oldChild: INode<K, V> | undefined = myNodes[idx];
    let newChild: INode<K, V> | undefined = oldChild;
    if (newChild === undefined) {
      if (value === MISSING) {
        return this;
      }
      newChild = newEmptyNode(owner);
    }
    const oldChildSize = newChild.size;
    newChild = newChild.set(item, keyHashShift + NODE_TRIE_BIT_COUNT, owner);
    const newSize = this.size + newChild.size - oldChildSize;

    if (newSize < NODE_BAG_COLLAPSE_THRESHOLD) {
      const oMap = new Map<K, Item<K, V>>();
      for (const item of this.items()) {
        oMap.set(item.key, item);
      }
      if (value === MISSING) {
        oMap.delete(key);
      } else {
        oMap.set(key, item as Item<K, V>);
      }
      return new BagNode(oMap, owner);
    }

    if (oldChild === newChild) {
      this.size = newSize;
      return this;
    }

    let result: TrieNode<K, V> = this;
    const inPlace = myToken === owner;
    if (!inPlace) {
      result = copyTrieNode(this, owner);
    }
    result.nodes[idx] = newChild;
    result.size = newSize;

    return result;
  }

  *items() {
    const { nodes } = this;
    for (let i = 0; i < NODE_TRIE_SIZE; i++) {
      const child = nodes[i];
      if (child !== undefined) {
        yield* child.items();
      }
    }
  }

}

function copyTrieNode<K, V>(source: TrieNode<K, V>, owner: symbol) {
  const myNodes = source.nodes;
  const result = new TrieNode<K, V>(owner);
  const newNodes = result.nodes;
  for (let i = 0; i < NODE_TRIE_SIZE; i++) {
    const val = myNodes[i];
    if (val !== undefined) {
      newNodes[i] = val;
    }
  }
  return result;
}
