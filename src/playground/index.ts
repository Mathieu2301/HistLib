import fs from 'fs';
import Histogram, { HistStrategy } from '../main';

export namespace playground {
  export function loadFile<Schema extends object>(path: string) {
    console.log(`Loading file: '${path}'`);
    const parsed = parseFile<Schema>(fs.readFileSync(path, 'utf8'));

    const options: {
      values: number[];
      quantiles: number[];
      strategies: Record<string, HistStrategy>;
    } = {
      values: [],
      quantiles: [],
      strategies: {},
    };

    const fields = (Object
      .keys(parsed[0])
      .map((key) => ({
        key,
        type: typeof parsed[0][key as keyof Schema],
      }))
    );

    if (!fields.length) {
      console.error('  No fields found');
      process.exit(1);
    }

    function useField(key: keyof Schema) {
      const _key = key as string;
      console.log(`  Using field: '${_key}'`);

      const field = fields.find((f) => f.key === key);

      if (!field) {
        console.error(`  Field '${_key}' not found`);
        process.exit(1);
      }

      if (field.type !== 'number') {
        console.error(`  Field '${_key}' is not a number`);
        process.exit(1);
      }

      options.values = parsed
        .map((item) => item[key as keyof Schema] as number)
        .filter((v) => Number.isFinite(v));

      options.values.sort((a, b) => a - b);

      if (!options.values.length) {
        console.error(`  Field '${_key}' has no values`);
        process.exit(1);
      }

      return {
        useQuantiles,
        useStrategies,
        compute,
      };
    }

    function useQuantiles(quantiles: number[]) {
      console.log(`  Using quantiles: ${quantiles.join('%, ')}%`);

      options.quantiles = quantiles;
      options.quantiles.sort((a, b) => a - b);

      return {
        useField,
        useStrategies,
        compute,
      };
    }

    function useStrategies<S extends Record<string, HistStrategy>>(strategies: S) {
      console.log(`  Using strategies:\n   - ${Object.keys(strategies).join('\n   - ')}`);
      options.strategies = strategies;

      return {
        useField,
        useQuantiles,
        compute: compute<S>,
      };
    }

    let results = {} as ReturnType<typeof processStrategiesComparison>;

    function compute<S extends Record<string, HistStrategy>>() {
      if (!checkOptions()) return;
      console.log(`  Computing results for ${options.values.length} values...`);

      results = processStrategiesComparison(options);

      return {
        log,
        logDistribution: logDistribution<S>,
      };
    }

    function log() {
      if (!results) {
        console.error('  No results to log');
        return;
      }

      console.log('  Logging results...\n');

      const filterColumns = (
        cols: (value: typeof results[keyof typeof results]) => void,
      ) => Object.fromEntries(
        Object.entries(results).map(([key, value]) => [key, cols(value)]),
      );

      console.log('======== Values count ========');
      console.table(filterColumns((value) => ({
        ...value.count,
      })));

      console.log('======== Quantile value ========');
      console.table(filterColumns((value) => ({
        ...value.val,
      })));

      console.log('======== Histogram statistics ========');
      console.table(filterColumns((value) => ({
        'Bucket count': value.bucketCount,
        'Max bucket size': value.maxBucketSize,
        'Hist value size': value.encodedHistSizePerValue,
        'Hist size': value.encodedHistSize,
      })));

      return {
        log,
        logDistribution,
      };
    }

    function logDistribution<
      S extends Record<string, HistStrategy>,
    >(strategyName: keyof S) {
      if (!results) {
        console.error('  No results to log');
        return;
      }

      const stratName = strategyName as keyof typeof results;
      console.log(`  Logging distribution for '${stratName}' strategy...\n`);

      const strategy = results[stratName];
      if (!strategy) {
        console.error(`Strategy '${stratName}' not found`);
        return;
      }

      console.log(`======== Distribution for '${stratName}' ========`);
      console.table(strategy.hist.getDistribution());

      return {
        log,
        logDistribution,
      };
    }

    function checkOptions() {
      if (!options.values.length) {
        console.error('No values provided');
        return false;
      }

      if (!options.quantiles.length) {
        console.error('No quantiles provided');
        return false;
      }

      return true;
    }

    return {
      useField,
      useQuantiles,
    };
  }
}

function parseFile<Schema>(file: string): Schema[] {
  try {
    return JSON.parse(file);
  } catch {
    const fileContent = (file.length > 160
      ? `${file.slice(0, 80)}...${file.slice(-80)}`
      : (file.length > 80
        ? `${file.slice(0, 80)}...`
        : file
      )
    );

    console.error(`Error parsing file '${fileContent}'`);
    process.exit(1);
  }
}

function processStrategiesComparison(options: {
  values: number[];
  quantiles: number[];
  strategies: Record<string, HistStrategy>;
}) {
  const strategies: Record<string, HistStrategy> = {
    'REFERENCE': { type: 'LINEAR', step: 0 },
    ...options.strategies,
  } as const;

  const reference = Histogram.create(strategies.REFERENCE);
  for (const value of options.values) reference.add(value);

  const results: Record<keyof typeof strategies, ReturnType<typeof analyzeStrategy>> = {};

  for (const [name, strategy] of Object.entries(strategies)) {
    results[name] = analyzeStrategy({ strategy, reference, ...options });
  }

  return results;
}

function analyzeStrategy({ strategy, quantiles, values, reference: ref }: {
  values: number[];
  quantiles: number[];
  strategy: HistStrategy;
  reference: Histogram<HistStrategy>;
}) {
  const hist = Histogram.create(strategy);
  for (const value of values) hist.add(value);

  const encodedHistData = hist.toBinary();
  const qValues = hist.genQuantiles(quantiles);
  const rqValues = ref.genQuantiles(quantiles);

  function countVals(qVal: number) {
    let count = 0;
    for (const value of values) {
      if (value >= qVal) count += 1;
    }
    return count;
  }

  type CompType = 'adiff' | 'rdiff' | 'rdiffp';
  function comp(val: number, ref: number, type: CompType) {
    if (val === ref) return '=';
    const diff = Math.abs(val - ref);
    const sign = (val > ref ? '+' : '-');

    if (type === 'rdiff') return `x${(val / ref).toFixed(2)}`;
    if (type === 'rdiffp') return `${sign}${(diff / ref * 100).toFixed(0)} %`;
    if (type === 'adiff') return `${sign}${(diff < -1 || diff > 1) ? diff.toFixed(0) : ''}`;
  }

  function getMaxBucketSize({ hist }: Histogram<HistStrategy>) {
    let max = 0;
    for (let i = 0; i < hist.length; i += 2) {
      max = Math.max(max, hist[i + 1]);
    }
    return max;
  }

  const maxBucketSize = getMaxBucketSize(hist);
  const maxBucketSizeComp = comp(maxBucketSize, getMaxBucketSize(ref), 'rdiff');

  const histSizeComp = comp(hist.histSize, ref.histSize, 'rdiffp');
  const encodedHistSizeComp = comp(encodedHistData.hist.length, ref.toBinary().hist.length, 'rdiffp');

  return {
    /** Number of buckets in the histogram */
    bucketCount: `${hist.histSize} (${histSizeComp})`,
    /** Max bucket size */
    maxBucketSize: `${maxBucketSize} (${maxBucketSizeComp})`,
    /** Encoded histogram size in kilobytes */
    encodedHistSize: `${(encodedHistData.hist.length / 1000).toFixed(2)} Kb (${encodedHistSizeComp})`,
    /** Encoded histogram size in bytes per value */
    encodedHistSizePerValue: `${(encodedHistData.hist.length / values.length).toFixed(2)} B`,

    val: Object.fromEntries(quantiles.map((q) => [
      `value(${q}%)`,
      `${qValues[`${q}%`].toExponential(2)} (${comp(qValues[`${q}%`], rqValues[`${q}%`], 'adiff')})`,
    ])),
    count: Object.fromEntries(quantiles.map((q) => [
      `count(${q}%)`,
      `${countVals(qValues[`${q}%`])} (${comp(countVals(qValues[`${q}%`]), countVals(rqValues[`${q}%`]), 'adiff')})`,
    ])),

    hist,
  }
}
