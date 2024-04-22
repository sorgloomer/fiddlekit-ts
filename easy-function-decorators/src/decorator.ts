import { Invocation } from "./invocation";
import { UnknownFunction } from "./types";
import { isFunction } from "./utils";

export type DecoratorLogic<T extends UnknownFunction> = (invocation: Invocation<T>, context: DecoratorContext<T>) => ReturnType<T>;

export function decorator<T extends UnknownFunction>(logic: DecoratorLogic<T>): MethodOrFunctionDecorator<T> {
  function decorator(
    target: Object,
    propertyKey: symbol | string | undefined,
    propertyDescriptor: TypedPropertyDescriptor<T & UnknownFunction>,
  ): void;
  function decorator(
    target: T,
  ): T;
  function decorator(
    targetOrFn: Object | T,
    propertyKey?: symbol | string | undefined,
    propertyDescriptor?: TypedPropertyDescriptor<T>,
  ): void | T {
    if (isFunction(targetOrFn) && propertyKey === undefined && propertyDescriptor === undefined) {
      return wrapFunction(logic, targetOrFn as T);
    }
    if (propertyKey !== undefined && propertyDescriptor !== undefined) {
      return decorateMethod(logic, targetOrFn, propertyKey, propertyDescriptor);
    }
    throw new TypeError();
  }

  moveProperties(decorator, logic);
  return decorator;
}

export function decoratorfn<T extends UnknownFunction>(factory: DecoratorLogicFactory<T>): DecoratorFactory<T> {
  return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    const logic = factory.apply(this, args);
    return decorator(logic);
  };
}

export type DecoratorLogicFactory<T extends UnknownFunction> = (...args: Parameters<T>) => DecoratorLogic<T>;
export type DecoratorFactory<T extends UnknownFunction> = (...args: Parameters<T>) => MethodOrFunctionDecorator<T>;
export type MethodOrFunctionDecorator<T extends UnknownFunction = UnknownFunction> =
  MethodDecorator2<T>
  & ((fn: T) => T);
export type MethodDecorator2<T extends UnknownFunction> = <U extends T>(target: Object, propertyKey: string | symbol | undefined, descriptor: TypedPropertyDescriptor<U>) => TypedPropertyDescriptor<U> | void;


export class DecoratorContext<T extends UnknownFunction> implements DecoratorContextFields<T> {
  public readonly original: T;
  public readonly decorated: T;
  public readonly isMethod: boolean;
  public readonly isConstructor: boolean;
  public readonly enclosingClass: any;
  public readonly enclosingPrototype: any;
  public readonly methodKey: string | symbol | undefined;
  public readonly logic: DecoratorLogic<T>;


  public constructor(fields: DecoratorContextFields<T>) {
    this.original = fields.original;
    this.isMethod = fields.isMethod;
    this.isConstructor = fields.isConstructor;
    this.enclosingClass = fields.enclosingClass;
    this.enclosingPrototype = fields.enclosingPrototype;
    this.methodKey = fields.methodKey;
    this.logic = fields.logic;
    const context = this;

    this.decorated = function decorated(this: ThisParameterType<T>, ...args: Parameters<T>): ReturnType<T> {
      const invocation = new Invocation<T>(context.original, this, args);
      return context.logic(invocation, context);
    } as T;
    moveProperties(this.decorated, context.original);
    Object.defineProperty(this.decorated, CONTEXT_SYMBOL, {
      enumerable: true,
      writable: false,
      value: this,
    });
  }
}

export const CONTEXT_SYMBOL = Symbol("CONTEXT_SYMBOL");

export function wrapFunction<T extends UnknownFunction>(logic: DecoratorLogic<T>, target: T) {
  return new DecoratorContext<T>({
    logic,
    isMethod: false,
    enclosingPrototype: undefined,
    isConstructor: false,
    enclosingClass: undefined,
    methodKey: undefined,
    original: target,
  }).decorated;
}

export function decorateMethod<T extends UnknownFunction>(
  logic: DecoratorLogic<T>,
  target: Object,
  propertyKey: symbol | string | undefined,
  propertyDescriptor: TypedPropertyDescriptor<T>,
) {
  if (!isFunction(propertyDescriptor.value)) {
    throw new TypeError();
  }
  const context = new DecoratorContext<T>({
    logic,
    isMethod: true,
    enclosingPrototype: target,
    isConstructor: propertyKey === undefined,
    enclosingClass: target.constructor,
    methodKey: propertyKey,
    original: propertyDescriptor.value,
  });
  propertyDescriptor.value = context.decorated;
}

function moveProperties<T>(dst: T, src: any): T {
  Object.defineProperties(dst, Object.getOwnPropertyDescriptors(src));
  return dst;
}


export type DecoratorContextFields<T extends UnknownFunction> = {
  readonly original: T;
  readonly logic: DecoratorLogic<T>;
  readonly isMethod: boolean;
  readonly isConstructor: boolean;
  readonly enclosingClass: any;
  readonly enclosingPrototype: any;
  readonly methodKey: string | symbol | undefined;
}
