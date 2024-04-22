import { hasOwn } from "../../easy-function-decorators/src/utils";
import { Inject } from "@nestjs/common";
import { decorateMethod } from "../../easy-function-decorators/src/decorator";
import { Invocation } from "../../easy-function-decorators/src/invocation";

export const transactionalTest = () => transactionalDecorator;

export type PropertyStoreKey = string | symbol;

const transactionalDecorator: MethodDecorator = (
  target: any,
  propertyKey: PropertyStoreKey,
  propertyDescriptor: TypedPropertyDescriptor<any>,
) => {
  if (!hasOwn(target, TRANSACTION_ASPECT_KEY)) {
    target[TRANSACTION_ASPECT_KEY] = undefined;
    Inject(TransactionalAspect)(target, propertyKey);
  }
  decorateMethod(
    async function <T>(this: TransactionAspectHolder, invocation: Invocation<(...args: unknown[]) => Promise<T>>): Promise<T> {
      return await this[TRANSACTION_ASPECT_KEY].runInTransaction(async () => {
        return await invocation.execute();
      });
    },
    target,
    propertyKey,
    propertyDescriptor,
  );
};

interface TransactionAspectHolder {
  [TRANSACTION_ASPECT_KEY]: TransactionalAspect;
}

declare class TransactionalAspect {
  runInTransaction<T>(fn: () => Promise<T>): Promise<T>;
}


const TRANSACTION_ASPECT_KEY = Symbol("TRANSACTION_ASPECT_KEY");
