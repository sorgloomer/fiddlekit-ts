export function replacer(key: string, value: any) {
  if (value instanceof Map) {
    return { $Map: Array.from(value.entries()) };
  }
  return value;
}

export function randint(mx: number) {
  return Math.floor(Math.random() * (mx - 1e-9));
}

export function sample<T>(arr: T[]) {
  return arr[randint(arr.length)];
}

export function generateArray<T>(count: number, fn: (i: number) => T): T[] {
  const result: T[] = new Array(count);
  for (let i = 0; i < count; i++) {
    result[i] = fn(i);
  }
  return result;
}

export const makeHashSequence = () => {
  let hash = 2279968573;
  return () => {
    hash = (((hash + 1) | 0) * 16807) | 0;
    return hash;
  };
};


export const makeIndexSequence = () => {
  let index = -1;
  return () => {
    index++;
    return { index };
  };
};

export const makeValueSequence = () => {
  let value = -1;
  return (): MockValueObj => {
    value++;
    return { value };
  };
};

export type MockValueObj = { value: number };


export function* enumerate<T>(items: Iterable<T>): IterableIterator<[T, number]> {
  let index = 0;
  for (const item of items) {
    yield [item, index];
    index++;
  }
}

export const sleep = (ms: number) => new Promise<void>(resolve => {
  setTimeout(() => {
    resolve();
  }, ms);
});

export const lazy = <T>(fn: () => T) => {
  let state = 0;
  let value: any = undefined;
  return () => {
    if (state === 0) {
      try {
        value = fn();
        state = 1;
      } catch (e: any) {
        value = e;
        state = 2;
      }
    }
    if (state === 2) {
      throw value;
    } else {
      return value;
    }
  };
}
