import Big from 'big.js';

export default class Float extends Number {
  static linearFloor(value: number, step: number) {
    if (step === 0 || !Number.isFinite(step)) return value;
    return Math.floor(value / step) * step;
  }

  linearFloor(step: number) {
    return Float.linearFloor(this.valueOf(), step);
  }

  /**
   * Cette fonction permet d'arrondir un nombre de manière "intelligente"
   * Elle prend en paramètre un nombre et une précision.
   * La précision est le nombre de chiffres significatifs.
   *
   * Exemples avec precision = 2:
   *  -0.00001111 => -0.000011
   *  -0.01111 => -0.011
   *  -0.118 => -0.12
   *  0.118 => 0.11
   *  0 => 0
   *  1 => 1
   *  1.1 => 1.1
   *  1.11 => 1.1
   *  1.18 => 1.1
   *  111 => 110
   *  118 => 110
   */
  static expFloor(value: number, precision: number, center = 0) {
    if (precision <= 0 || value === 0) return 0;
    if (value === center) return value;
    if (precision > 100 || !Number.isFinite(value)) return value;

    const val = Big(value).minus(center);

    return (Big(val.toPrecision(precision, (val.lt(0) ? 3 : 0)))
      .plus(center)
      .toNumber()
    );
  }

  expFloor(precision: number, center = 0) {
    return Float.expFloor(this.valueOf(), precision, center);
  }
}
