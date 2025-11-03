const React = require('react');

if (typeof React.cache !== 'function') {
  const RESULT = Symbol('result');

  const createCacheWrapper = fn => {
    if (typeof fn !== 'function') {
      throw new TypeError('React.cache() expects a function.');
    }
    const root = new Map();

    const cachedFn = (...args) => {
      let node = root;
      for (const arg of args) {
        let next = node.get(arg);
        if (!next) {
          next = new Map();
          node.set(arg, next);
        }
        node = next;
      }

      if (node.has(RESULT)) {
        return node.get(RESULT);
      }

      const result = fn(...args);
      node.set(RESULT, result);

      if (
        result &&
        typeof result.then === 'function' &&
        typeof result.catch === 'function'
      ) {
        result.catch(() => {
          node.delete(RESULT);
        });
      }

      return result;
    };

    return cachedFn;
  };

  Object.defineProperty(React, 'cache', {
    value: createCacheWrapper,
    writable: false,
    configurable: true,
    enumerable: true,
  });
}
