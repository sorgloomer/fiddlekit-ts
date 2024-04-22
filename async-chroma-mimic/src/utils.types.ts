export type OrPromise<T> = T | Promise<T>;
export type OrAsync<T extends AnyFunction> = (this: ThisParameterType<T>, ...args: Parameters<T>) => OrPromise<ReturnType<T>>;

export type AnyFunction = (this: any, ...args: any[]) => any;
export type UnknownFunction = (this: unknown, ...args: unknown[]) => unknown;
