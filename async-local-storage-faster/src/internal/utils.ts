import { BagNode } from "./bag-node";

export function newEmptyNode<K, V>(token: symbol) {
  return new BagNode<K, V>(new Map(), token);
}
