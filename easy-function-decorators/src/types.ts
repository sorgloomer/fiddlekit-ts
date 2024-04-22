export type UnknownFunction = (this: unknown, ...args: unknown[]) => unknown;

export type AnyFunction = (this: any, ...args: any[]) => any;

export type Returning<T> = (this: unknown, ...args: unknown[]) => T;
