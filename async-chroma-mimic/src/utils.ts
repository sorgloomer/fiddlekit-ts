import { AnyFunction } from "./utils.types";

export function isPromiseLike(x: any): x is PromiseLike<unknown> {
  const xtype = typeof x;
  if (xtype !== "object" && xtype !== "function") {
    return false;
  }
  const then = x.then;
  return typeof then === "function";
}

export function defined<T>(x: T | undefined | null): T {
  if (x == null) {
    throw new TypeError(String(x));
  }
  return x;
}


export type StaticApplyFn = <T extends AnyFunction>(
  targetFn: T,
  thisArg: ThisParameterType<NoInfer<T>>,
  args: Parameters<NoInfer<T>>
) => ReturnType<NoInfer<T>>;

export function copyProp(dst: unknown, src: unknown, prop: PropertyKey): void {
  defineProperty(dst, prop, defined(getOwnPropertyDescriptor(src, prop)));
}

const { defineProperty, getOwnPropertyDescriptor } = Object;
const { call, apply } = Function.prototype;
export const staticApply: StaticApplyFn = call.bind(apply);
