import { describe, test, expect } from 'vitest';
import NumberArray from '.';

describe('NumberArray: should encode and decode arrays of numbers correctly', () => {
  function testWith(array: Array<number>) {
    // Replace -0 with 0
    array = array.map((n) => (Object.is(n, -0) ? 0 : n));

    const encoded = NumberArray.toBinary(array);
    const decoded = NumberArray.fromBinary(encoded);

    return expect(decoded).toEqual(array);
  }

  test('edge cases', () => {
    testWith([]);
    testWith([-0]);
    testWith([0]);
    testWith([1]);
    testWith([-9.8, -7.6, -5.4, -3.2, -1, 0, 1, 2.3, 4.5, 6.7, 8.9]);
    testWith([Infinity]);
    testWith([-Infinity]);
    testWith([NaN]);
    testWith([Infinity, -Infinity, NaN]);
  });

  test('integers', () => {
    for (let n = 0; n <= 10000; n += 1) testWith([n, n + 1, n + 2, n + 3, n + 4, n + 5]);
    for (let n = 2; n < Infinity; n **= 2) testWith([n, n * 2, n * 3, n * 4, n * 5, n * 6]);
  });

  test('floats', () => {
    for (let n = 0; n <= 10000; n += 1) {
      testWith([
        (Math.random() > 0.5 ? -1 : 1) * (Math.random() ** (Math.random() * 100)),
        (Math.random() > 0.5 ? -1 : 1) * (Math.random() ** (Math.random() * 100)),
      ]);
    }
  });
});
