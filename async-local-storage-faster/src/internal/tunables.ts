export const NODE_TRIE_BIT_COUNT = 3;
export const NODE_BAG_MAX_SIZE = 16;
export const NODE_BAG_COLLAPSE_THRESHOLD = NODE_BAG_MAX_SIZE >>> 1;
export const NODE_TRIE_SIZE = 1 << NODE_TRIE_BIT_COUNT;
export const NODE_TRIE_BIT_MASK = (NODE_TRIE_SIZE - 1) | 0;
export const HASH_BIT_COUNT = 32;
