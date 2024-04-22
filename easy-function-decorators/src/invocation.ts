import { UnknownFunction } from "./types";

export class Invocation<T extends UnknownFunction = UnknownFunction> {
  public constructor(
    public fn: T,
    public thisArg: ThisParameterType<T>,
    public args: Parameters<T>,
  ) {
  }

  public execute(): ReturnType<T> {
    return staticApply(this.fn, this.thisArg, this.args);
  }
}

export type ApplyFn = <T extends UnknownFunction>(
  targetFn: T,
  thisArg: ThisParameterType<T>,
  args: Parameters<T>) => ReturnType<T>;

const { call, apply } = Function.prototype;
export const staticApply: ApplyFn = call.bind(apply);
