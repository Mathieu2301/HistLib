import NumberArray from '../NumberArray';
import Float from '../Float';

export type HistStrategy = (
  {
    /** Arrondi exponentiel */
    readonly type: 'EXPONENTIAL';
    /** Nombre de chiffres significatifs */
    readonly precision: number;
    /** Centre de la distribution */
    readonly center?: number;
  } | {
    /** Arrondi linéaire */
    readonly type: 'LINEAR';
    /** Pas de l'arrondi */
    readonly step: number;
  }
);

export interface HistData<Strategy extends HistStrategy> {
  readonly strategy: Strategy;
  readonly histSize: number;
  valuesCount: number;
  hist: Array<number>;
}

export type EncodedHistData<Strategy extends HistStrategy> = (
  Omit<HistData<Strategy>, 'hist'>
  & { hist: string }
);

export class Histogram<Strategy extends HistStrategy> implements HistData<Strategy> {
  readonly strategy: Strategy;
  readonly hist: Array<number>;
  valuesCount: number;
  histSize: number;

  private constructor(histData: HistData<Strategy>) {
    Object.assign(this, histData);
  }

  static create<Strategy extends HistStrategy>(strategy: Strategy) {
    return new Histogram({
      strategy,
      histSize: 0,
      valuesCount: 0,
      hist: [],
    });
  }

  static load<Strategy extends HistStrategy>(histData: EncodedHistData<Strategy>) {
    const hist = NumberArray.fromBinary(histData.hist);

    if (hist.length % 2 !== 0) {
      throw new Error('Invalid encoded histogram');
    }

    return new Histogram({
      strategy: histData.strategy,
      histSize: histData.histSize,
      valuesCount: histData.valuesCount,
      hist,
    });
  }

  floorValue(value: number) {
    const { type } = this.strategy;

    if (type === 'EXPONENTIAL') {
      const { precision, center } = this.strategy;

      return Float.expFloor(value, precision, center);
    }

    const { step } = this.strategy;
    return Float.linearFloor(value, step);
  }

  add(rawVal: number, autoFloor = true): string {
    if (!Number.isFinite(rawVal)) {
      console.error('Invalid value:', rawVal);
      return 'Invalid value';
    }

    const floorVal = (autoFloor
      ? this.floorValue(rawVal)
      : rawVal
    );

    const { hist, histSize: size } = this;

    for (let i = 0; i < (size * 2); i += 2) {
      const cursorVal = hist[i];
      const cnt = hist[i + 1];

      if (typeof cursorVal !== 'number' || typeof cnt !== 'number') {
        if ((size * 2) === hist.length) continue;
        this.histSize = Math.floor(hist.length / 2);
        return this.add(floorVal, false);
      }

      if (cursorVal === floorVal) {
        hist[i + 1] += 1;
        this.valuesCount += 1;
        return `hist[${i}...${i + 1}] = [${cursorVal}, ${cnt + 1}] (increment)`;
      }

      if (cursorVal > floorVal) {
        hist.splice(i, 0, floorVal, 1);
        this.histSize += 1;
        this.valuesCount += 1;
        return `hist[${i}...${i + 1}] = [${floorVal}, 1] (middle push)`;
      }
    }

    hist.push(floorVal, 1);
    this.valuesCount += 1;
    this.histSize += 1;
    return `hist[${size * 2}...${size * 2 + 1}] = [${floorVal}, 1] (end push)`;
  }

  /**
   * Renvoie un objet contenant des quantiles de la distribution
   * Cela permet de savoir si un nombre est dans le top x%
   */
  genQuantiles<Quantile extends number>(askedQuantiles: Readonly<Array<Quantile>>) {
    const sortedAskedQuantiles = [...askedQuantiles].sort((a, b) => a - b);
    const { hist, valuesCount } = this;
    const quantiles = {} as { [key in `${Quantile}%`]: number };

    let i = hist.length - 2;
    let sum = 0;

    for (const q of sortedAskedQuantiles) {
      if (valuesCount === 0) {
        quantiles[`${q}%`] = -Infinity;
        continue;
      }

      if (q <= 0) {
        quantiles[`${q}%`] = hist[hist.length - 2];
        continue;
      }

      if (q >= 100) {
        quantiles[`${q}%`] = hist[0];
        continue;
      }

      const target = Math.floor((valuesCount * q) / 100);

      for (; i >= 0; i -= 2) {
        if (sum === target) {
          quantiles[`${q}%`] = hist[i];
          break;
        }

        if (sum > target) {
          quantiles[`${q}%`] = hist[i + 2];
          break;
        }

        sum += hist[i + 1];
      }

      if (i < 0) quantiles[`${q}%`] = hist[0];
    }

    return quantiles;
  }

  getValues(min = -Infinity): Array<number> {
    const values: number[] = [];
    const { hist } = this;

    for (let i = 0; i < hist.length; i += 2) {
      if (hist[i] < min) continue;
      const val = hist[i];
      const cnt = hist[i + 1];

      for (let j = 0; j < cnt; j += 1) values.push(val);
    }

    return values;
  }

  toBinary(): EncodedHistData<Strategy> {
    return {
      strategy: this.strategy,
      histSize: this.histSize,
      valuesCount: this.valuesCount,
      hist: NumberArray.toBinary(this.hist),
    };
  }

  getDistribution(barWidth = 40) {
    const table: Array<TableRow> = [];

    const maxCount = Math.max(...this.hist.filter((_, i) => (i % 2)));
    const maxPercent = Math.ceil((maxCount / this.valuesCount) * 10000) / 100;

    for (let i = 0; i < this.histSize * 2; i += 2) {
      const Value = this.hist[i];
      const Count = this.hist[i + 1];
      const Cumulated = (table[table.length - 1]?.Cumulated ?? 0) + Count;
      const percent = Math.round((Count / this.valuesCount) * 10000) / 100;
      const zoomedPercent = Math.floor((percent / maxPercent) * barWidth);

      const Bar = [
        '█'.repeat(zoomedPercent),
        ' '.repeat(barWidth - zoomedPercent),
        ' ',
        `${percent.toFixed(2)}%`,
      ].join('');

      table.push({ Value, Count, Cumulated, Bar });
    }

    return table;
  }

  toString() {
    return this.getDistribution().map((row) => (
      `${row.Value.toFixed(3)}: ${row.Bar}`
    )).join('\n');
  }

  /**
   * Renvoie la valeur du quantile demandé
   * (à utiliser pour vérifier les résultats de genQuantiles)
   */
  static getQuantile(values: number[], quantile: number) {
    if (!values.length) return -Infinity;

    const sortedValues = [...values].sort((a, b) => b - a);
    if (quantile <= 0) return sortedValues[0];
    if (quantile >= 100) return sortedValues[sortedValues.length - 1];

    return sortedValues[Math.floor((sortedValues.length * quantile) / 100)];
  }
}

interface TableRow {
  Value: number;
  Count: number;
  Cumulated: number;
  Bar: string;
}
