import { describe, test, expect } from 'vitest';
import { Histogram, HistStrategy, type EncodedHistData } from '.';

describe('Histogram', () => {
  test('getValues() should return the same values as the ones added', () => {
    const linNbr = () => (Math.random() - 0.5) * 100;
    const expNbr = () => ((Math.random() - 0.5)
      * (Math.random() - 0.5)
      * (Math.random() - 0.5)
      * (10 ** (Math.random() - 0.5))
      * 1000
    );

    testWith({ type: 'EXPONENTIAL', precision: 3 }, expNbr);
    testWith({ type: 'LINEAR', step: 0.01 }, linNbr);

    function testWith(strategy: HistStrategy, newNbr: () => number) {
      const hist = Histogram.create(strategy);
      const values: number[] = [];

      for (let i = 0; i < 1000; i += 1) {
        const nbr = newNbr();
        values.push(nbr);
        hist.add(nbr);
      }

      values.sort((a, b) => a - b);

      const gettedValues = hist.getValues();
      const floorValues = values.map((v) => hist.floorValue(v));

      expect(gettedValues).toEqual(floorValues);
    }
  });

  test('step by step', () => {
    const values: number[] = [];

    let encodedHistData: EncodedHistData<any>;

    /**
     * 1. On crée un histogramme vide
     */
    const hist = Histogram.create({ type: 'LINEAR', step: 0.001, center: 0 });
    encodedHistData = hist.toBinary();

    for (let i = 0; i < 300; i += 1) {
      /**
       * 2. On decode l'histogramme et on vérifie que les quantiles sont à peu près corrects
       */

      const results = checkQuantiles(encodedHistData, values);

      if (results.maxRelDiff > 0) {
        console.log(`Check: ${i}`);
        console.table(results.quantiles);
        console.log(`  Average relative difference: ${(results.avgRelDiff * 100).toFixed(2)}%`);
        console.log(`  Max relative difference: ${(results.maxRelDiff * 100).toFixed(2)}%`);
      }

      expect(results.maxRelDiff).toBe(0);

      /**
       * 3. On décode l'histogramme, on lui ajoute une valeur et on le re-encode
       */
      const hist = Histogram.load(encodedHistData);
      const nbr = Math.random() * 100;

      values.push(nbr);
      hist.add(nbr);

      encodedHistData = hist.toBinary();

      // On vérifie que l'histogramme a une taille raisonnable (moins de 2.8 Kb)
      expect(encodedHistData.hist.length).toBeLessThan(2.8 * 1000);
    }

    // On vérifie que l'histogramme a une taille raisonnable (moins de 8.7 Bytes par valeur)
    expect(encodedHistData.hist.length / values.length).toBeLessThan(8.7);

    const histSize = (encodedHistData.hist.length / 1000).toFixed(2);
    const histSizePerValue = (encodedHistData.hist.length / values.length).toFixed(1);
    console.log(`Done ! The histogram contains ${values.length} values, encoded in ${histSize} Kb (${histSizePerValue} Bytes per value)`);
  });

  test('with random data distributed in a normal distribution', () => {
    const hist = Histogram.create({ type: 'EXPONENTIAL', precision: 4, center: 0 });
    // const hist = Histogram.create({ type: 'LINEAR', step: 0.01, center: 0 });

    const values: number[] = [];

    for (let i = 0; i < 1000; i += 1) {
      const nbr = (Math.random() - 0.5) * 100;
      // const nbr = (Math.random() - 0.5) * (Math.random() - 0.5) * (Math.random() - 0.5) * (10 ** (Math.random() - 0.5)) * 1000;
      values.push(nbr);
      hist.add(nbr);
    }

    const encodedHistData = hist.toBinary();
    const results = checkQuantiles(encodedHistData, values);

    if (results.maxRelDiff > 0) {
      console.table(Histogram.load(encodedHistData).getDistribution());
      console.table(results.quantiles);
    }
    console.log(`  Average relative difference: ${(results.avgRelDiff * 100).toFixed(2)}%`);
    console.log(`  Max relative difference: ${(results.maxRelDiff * 100).toFixed(2)}%`);
    console.log(`  Encoded histogram size: ${(encodedHistData.hist.length / 1000).toFixed(2)} Kb`);
    console.log(`  Encoded value size: ${(encodedHistData.hist.length / values.length).toFixed(2)} B`);

    expect(results.maxRelDiff).toBe(0);

    // On vérifie que l'histogramme a une taille raisonnable (moins de 10 Kb)
    expect(encodedHistData.hist.length).toBeLessThan(10 * 1000);

    // On vérifie que l'histogramme a une taille raisonnable (moins de 8.7 Bytes par valeur)
    expect(encodedHistData.hist.length / values.length).toBeLessThan(8.7);

    const histSize = (encodedHistData.hist.length / 1000).toFixed(2);
    const histSizePerValue = (encodedHistData.hist.length / values.length).toFixed(1);
    console.log(`Done ! The histogram contains ${values.length} values, encoded in ${histSize} Kb (${histSizePerValue} Bytes per value)`);
  });
});

function checkQuantiles(
  encodedHist: EncodedHistData<HistStrategy>,
  values: Array<number>,
  barWidth: number = 40,
) {
  const hist = Histogram.load(encodedHist);

  const testedQuantiles = [
    100,
    99, 98, 97, 96, 95, 94, 93, 92, 91,
    90, 89, 88, 87, 86, 85, 84, 83, 82, 81,
    80, 79, 78, 77, 76, 75, 74, 73, 72, 71,
    70, 69, 68, 67, 66, 65, 64, 63, 62, 61,
    60, 59, 58, 57, 56, 55, 54, 53, 52, 51,
    50, 49, 48, 47, 46, 45, 44, 43, 42, 41,
    40, 39, 38, 37, 36, 35, 34, 33, 32, 31,
    30, 29, 28, 27, 26, 25, 24, 23, 22, 21,
    20, 19, 18, 17, 16, 15, 14, 13, 12, 11,
    10, 9, 8, 7, 6, 5, 4, 3, 2, 1,
    0.5,
  ] as const;

  const computedQuantiles = hist.genQuantiles(testedQuantiles);

  let maxRelDiff = 0;
  let relDiffSum = 0;

  const floorValues = values.map((v) => hist.floorValue(v));

  const quantiles = Object.fromEntries(
    testedQuantiles.map((q) => {
      const computed = computedQuantiles[`${q}%`];
      const expected = Histogram.getQuantile(floorValues, q);

      const absDiff = (Number.isFinite(expected) ? (computed - expected) : 0);
      const relDiff = (Number.isFinite(expected) ? (absDiff / expected) : 0);
      const sign = (absDiff >= 0 ? '+' : '-');
      const posRelDiff = Math.abs(relDiff);
      const posAbsDiff = Math.abs(absDiff);

      maxRelDiff = Math.max(maxRelDiff, posRelDiff);
      relDiffSum += posRelDiff;

      return [`${q}%`, {
        computed,
        expected,
        sign,
        posAbsDiff,
        posRelDiff,
      }];
    }).map(([q, data]) => {
      if (typeof data === 'string') return [q, {}];

      const zoomedPercent = Math.floor((data.posRelDiff / maxRelDiff) * barWidth);

      if (data.posRelDiff === 0) return [q, {
        Computed: data.computed,
        Expected: data.expected,
      }];

      return [q, {
        Computed: data.computed,
        Expected: data.expected,
        AbsDiff: `${data.sign}${data.posAbsDiff.toFixed(3)}`,
        RelDiff: [
          '█'.repeat(zoomedPercent),
          ' '.repeat(barWidth - zoomedPercent),
          ' ',
          `${data.sign}${(data.posRelDiff * 100).toFixed(2)}%`,
        ].join(''),
      }];
    }),
  ) as {
    [q in `${typeof testedQuantiles[number]}%`]: {
      Computed: number;
      Expected: number;
      AbsDiff: string;
      RelDiff: string;
    };
  };

  return {
    quantiles,
    maxRelDiff,
    avgRelDiff: relDiffSum / testedQuantiles.length,
  };
}
