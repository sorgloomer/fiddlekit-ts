import { UnknownFunction } from "./types";

export const hasOwn: ((target: any, propertyKey: PropertyKey) => boolean) = Function.prototype.call.bind(Object.prototype.hasOwnProperty);

export function isFunction(x: any): x is UnknownFunction {
  return typeof x === "function";
}
