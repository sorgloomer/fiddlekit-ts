import { copyProp, isPromiseLike, staticApply } from "./utils";
import { OrPromise } from "./utils.types";


export function makeMimic<TReturn, TArgs extends unknown[], TThis = unknown>(
  fn: (this: TThis, ...args: TArgs) => Generator<unknown, TReturn>
): (this: TThis, ...args: TArgs) => OrPromise<TReturn> {
  const result = function (this: TThis, ...args: TArgs): OrPromise<TReturn> {
    return runMimicIterator(staticApply(fn, this, args));
  };
  copyProp(result, fn, "name");
  copyProp(result, fn, "length");
  return result;
}

export function callMimic<T>(
  fn: () => Generator<unknown, T>
): OrPromise<T> {
  return runMimicIterator(fn());
}

export function runMimicIterator<T>(iter: Generator<unknown, T>) {
  let feedbackValue: unknown = undefined;

  for (; ;) {
    const { done, value } = iter.next(feedbackValue);
    if (done) {
      return value;
    }
    if (isPromiseLike(value)) {
      return runAsyncFallback(value, iter);
    }
    feedbackValue = value;
  }
}

async function runAsyncFallback<T>(firstPromise: PromiseLike<unknown>, iter: Generator<unknown, T>) {
  let yielded: unknown = firstPromise;
  for (; ;) {
    let feedbackIsError = false;
    let feedbackError: unknown = undefined;
    let feedbackValueAsync: unknown = undefined;
    try {
      feedbackValueAsync = await yielded;
    } catch (error) {
      feedbackError = error;
      feedbackIsError = true;
    }

    const { done, value } = feedbackIsError ? iter.throw(feedbackError) : iter.next(feedbackValueAsync);
    if (done) {
      return value;
    }
    yielded = value;
  }
}
