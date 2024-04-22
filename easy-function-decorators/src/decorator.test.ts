import { describe, expect, it } from 'vitest';
import { decorator } from './decorator';

describe('decorator', () => {
  it('does not pollute other methods', () => {
    const { logs, service } = setup();
    expect(service.foo()).toEqual('return foo');
    expect(logs).toEqual(['foo']);
  });

  it('wraps success responses', () => {
    const { logs, service } = setup();
    expect(service.bar()).toEqual('return bar');
    expect(logs).toEqual(['transaction begin', 'bar', 'transaction end']);
  });

  it('handles errors', () => {
    const { logs, service } = setup();
    expect(() => service.baz()).toThrowError('baz error');
    expect(logs).toEqual(['transaction begin', 'baz', 'transaction end']);
  });
});


function setup() {
  const logs: string[] = [];

  const transactional = decorator(invocation => {
    logs.push('transaction begin');
    try {
      return invocation.execute();
    } finally {
      logs.push('transaction end');
    }
  });

  class TestClass {
    foo() {
      logs.push('foo');
      return 'return foo';
    }

    @transactional
    bar() {
      logs.push('bar');
      return 'return bar';
    }

    @transactional
    baz() {
      logs.push('baz');
      throw new Error('baz error');
    }
  }
  const service = new TestClass();

  return { logs, service, TestClass };
}

