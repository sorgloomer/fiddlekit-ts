import { MISSING } from "../PersistentMap";
import { INode, KeyHash } from "./types";
import { Item } from "./item";
import { HASH_BIT_COUNT, NODE_BAG_MAX_SIZE, NODE_TRIE_BIT_COUNT, NODE_TRIE_BIT_MASK } from "./tunables";
import { TrieNode } from "./trie-node";
import { newEmptyNode } from "./utils";


export class BagNode<K, V> implements INode<K, V> {
  constructor(
    public bag: Map<K, Item<K, V>>,
    public readonly owner: unknown,
  ) {
  }

  get size() {
    return this.bag.size;
  }

  get(key: K, keyHash: KeyHash, keyHashShift: number): Item<K, V> | undefined {
    return this.bag.get(key);
  }

  set(item: Item<K, V | MISSING>, keyHashShift: number, owner: symbol): INode<K, V> {
    keyHashShift |= 0;
    const keyHash = item.keyHash | 0;
    const { key, value } = item;
    const { bag: iMap, owner: myOwner } = this;
    const oldItem = iMap.get(key);
    const oldValue = oldItem !== undefined ? oldItem.value : MISSING;
    item.previousValue = oldValue;
    if (value === oldValue) {
      return this;
    }

    const inPlace = owner === myOwner;
    const oMap = inPlace ? iMap : new Map(iMap);
    if (value === MISSING) {
      oMap.delete(key);
    } else {
      oMap.set(key, new Item(key, keyHash, value));
    }

    const newKeyHashShift = (keyHashShift + (NODE_TRIE_BIT_COUNT | 0)) | 0;
    if (oMap.size <= NODE_BAG_MAX_SIZE || (newKeyHashShift >= HASH_BIT_COUNT)) {
      return inPlace ? this : new BagNode(oMap, owner);
    }
    const newNode = new TrieNode<K, V>(owner);
    const newNodes = newNode.nodes;
    const nextKeyHashShift = (keyHashShift + NODE_TRIE_BIT_COUNT) | 0;
    for (let item of oMap.values()) {
      const idx = (item.keyHash >>> keyHashShift) & NODE_TRIE_BIT_MASK;
      let child = newNodes[idx];
      if (child === undefined) {
        child = newEmptyNode(owner);
      }
      child = child.set(item, nextKeyHashShift, owner);
      newNodes[idx] = child;
    }
    newNode.size = oMap.size;
    return newNode;
  }

  items() {
    return this.bag.values();
  }
}
