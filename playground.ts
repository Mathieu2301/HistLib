import fs from 'fs';
import { playground } from '.';

type Entry = { v: number };
const values: Entry[] = [];

for (let i = 0; i < 10000; i += 1) {
  const v = (
    (Math.random() - 0.5)
    * Math.random()
    * Math.random()
    * Math.random()
    * 100
  );
  values.push({ v });
}

fs.writeFileSync('./playground.json', JSON.stringify(values));

(playground.loadFile<Entry>(
  './playground.json',
)
  .useField('v')
  // .useQuantiles([0, 25, 50, 75, 100])
  .useQuantiles([
    // -1, -0.1,
    // 0, 1, 5, 10,
    // 25, 50, 75,
    // 99, 100,
    // 100.99, 101, 101.99,
    5, 20, 80, 95,
  ])
  .useStrategies({
    'EXP(precision = 1)': { type: 'EXPONENTIAL', precision: 1 },
    'EXP(precision = 2)': { type: 'EXPONENTIAL', precision: 2 },
    'EXP(precision = 3)': { type: 'EXPONENTIAL', precision: 3 },
    'EXP(precision = 4)': { type: 'EXPONENTIAL', precision: 4 },
    'EXP(precision = 5)': { type: 'EXPONENTIAL', precision: 5 },
    'LINEAR(s = 10^-0)': { type: 'LINEAR', step: 1.0 },
    'LINEAR(s = 10^-1)': { type: 'LINEAR', step: 0.1 },
    'LINEAR(s = 10^-2)': { type: 'LINEAR', step: 0.01 },
    'LINEAR(s = 10^-3)': { type: 'LINEAR', step: 0.001 },
    'LINEAR(s = 10^-4)': { type: 'LINEAR', step: 0.0001 },
  })
  .compute()
  ?.logDistribution('LINEAR(s = 10^-0)')
  ?.log()
);
