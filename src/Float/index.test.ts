import { describe, it, expect } from 'vitest';
import Float from '.';

describe('Float', () => {
  describe('.linearFloor(step)', () => {
    const floor = Float.linearFloor;

    it('should floor to the nearest integer', () => {
      expect(floor(1.1, 1)).toBe(1);
      expect(floor(1.9, 1)).toBe(1);
      expect(floor(1.1, 2)).toBe(0);
      expect(floor(1.9, 2)).toBe(0);
    });

    it('should floor to the nearest multiple of the step', () => {
      expect(floor(1.1, 0.5)).toBe(1);
      expect(floor(1.9, 0.5)).toBe(1.5);
      expect(floor(1.1, 0.25)).toBe(1);
      expect(floor(1.9, 0.75)).toBe(1.5);
    });

    it('should floor to the nearest multiple of the step (negative)', () => {
      expect(floor(-1.1, 0.5)).toBe(-1.5);
      expect(floor(-1.9, 0.5)).toBe(-2);
      expect(floor(-1.1, 0.25)).toBe(-1.25);
      expect(floor(-1.9, 0.25)).toBe(-2);
    });

    it('should floor to the nearest multiple of the step (negative step)', () => {
      expect(floor(1.1, -0.5)).toBe(1.5);
      expect(floor(1.9, -0.5)).toBe(2);
      expect(floor(1.1, -0.25)).toBe(1.25);
      expect(floor(1.9, -0.25)).toBe(2);
    });

    it('should handle some edge cases', () => {
      expect(floor(0, 0)).toBe(0);
      expect(floor(0, Infinity)).toBe(0);
      expect(floor(0, -Infinity)).toBe(0);
      expect(floor(0, NaN)).toBe(0);

      expect(floor(1.2, 0)).toBe(1.2);
      expect(floor(1.2, Infinity)).toBe(1.2);
      expect(floor(1.2, -Infinity)).toBe(1.2);
      expect(floor(1.2, NaN)).toBe(1.2);
    });
  });

  describe('.expFloor(precision)', () => {
    const floor = Float.expFloor;

    it('should return a number with the correct precision', () => {
      expect(floor(4.0000e-5, 3)).toBe(0.0000400);
      expect(floor(4.8000e-5, 3)).toBe(0.0000480);
      expect(floor(4.8900e-5, 3)).toBe(0.0000489);
      expect(floor(4.8930e-5, 3)).toBe(0.0000489);
      expect(floor(4.8935e-5, 3)).toBe(0.0000489);

      expect(floor(0.0001111, 3)).toBe(0.000111);
      expect(floor(0.0011111, 3)).toBe(0.001110);
      expect(floor(0.0111111, 3)).toBe(0.011100);
      expect(floor(0.1111111, 3)).toBe(0.111000);
      expect(floor(1.1111111, 3)).toBe(1.110000);
      expect(floor(11.111111, 3)).toBe(11.10000);
      expect(floor(111.11111, 3)).toBe(111.0000);
      expect(floor(1111.1111, 3)).toBe(1110.000);
      expect(floor(11111.111, 3)).toBe(11100.00);

      expect(floor(0.0009999, 3)).toBe(0.000999);
      expect(floor(0.0099999, 3)).toBe(0.009990);
      expect(floor(0.0999999, 3)).toBe(0.099900);
      expect(floor(0.9999999, 3)).toBe(0.999000);
      expect(floor(9.9999999, 3)).toBe(9.990000);
      expect(floor(99.999999, 3)).toBe(99.90000);
      expect(floor(999.99999, 3)).toBe(999.0000);
      expect(floor(9999.9999, 3)).toBe(9990.000);
      expect(floor(99999.999, 3)).toBe(99900.00);

      expect(floor(-0.0001111, 3)).toBe(-0.000112);
      expect(floor(-0.0011111, 3)).toBe(-0.001120);
      expect(floor(-0.0111111, 3)).toBe(-0.011200);
      expect(floor(-0.1111111, 3)).toBe(-0.112000);
      expect(floor(-1.1111111, 3)).toBe(-1.120000);
      expect(floor(-11.111111, 3)).toBe(-11.20000);
      expect(floor(-111.11111, 3)).toBe(-112.0000);
      expect(floor(-1111.1111, 3)).toBe(-1120.000);
      expect(floor(-11111.111, 3)).toBe(-11200.00);

      expect(floor(-0.0009999, 3)).toBe(-0.001000);
      expect(floor(-0.0099999, 3)).toBe(-0.010000);
      expect(floor(-0.0999999, 3)).toBe(-0.100000);
      expect(floor(-0.9999999, 3)).toBe(-1.000000);
      expect(floor(-9.9999999, 3)).toBe(-10.00000);
      expect(floor(-99.999999, 3)).toBe(-100.0000);
      expect(floor(-999.99999, 3)).toBe(-1000.000);
      expect(floor(-9999.9999, 3)).toBe(-10000.00);
      expect(floor(-99999.999, 3)).toBe(-100000.0);
    });

    it('should return 0 when precision is 0', () => {
      expect(floor(0, 0)).toBe(0);
      expect(floor(1, 0)).toBe(0);
      expect(floor(Infinity, 0)).toBe(0);
      expect(floor(-Infinity, 0)).toBe(0);
      expect(floor(NaN, 0)).toBe(0);
    });

    it('should return 0 when number is 0', () => {
      expect(floor(0, 1)).toBe(0);
      expect(floor(0, 2)).toBe(0);
      expect(floor(0, Infinity)).toBe(0);
      expect(floor(0, -Infinity)).toBe(0);
      expect(floor(0, NaN)).toBe(0);
    });

    it('should handle some edge cases', () => {
      expect(floor(Infinity, 1)).toBe(Infinity);
      expect(floor(Infinity, Infinity)).toBe(Infinity);
      expect(floor(-Infinity, -Infinity)).toBe(0);

      expect(floor(1.2345, 0)).toBe(0);
      expect(floor(1.2345, -1)).toBe(0);
      expect(floor(1.2345, -2)).toBe(0);
    });
  });
});
