import {assert} from 'chai';
import {inspect} from 'util';
import {defaultConfig} from '../src/config';
import {extractTransformsFromEncoding, normalizeEncoding} from '../src/encoding';
import * as log from '../src/log';

describe('encoding', () => {
  describe('normalizeEncoding', () => {
    it('should convert lat and long type to channels', () => {
      const encoding = normalizeEncoding({
        x: {field: 'a', type: 'longitude'},
        y: {field: 'b', type: 'latitude'},
        x2: {field: 'a2', type: 'longitude'},
        y2: {field: 'b2', type: 'latitude'}
      }, 'rule');

      assert.deepEqual(encoding, {
        longitude: {field: 'a', type: 'quantitative'},
        latitude: {field: 'b', type: 'quantitative'},
        longitude2: {field: 'a2', type: 'quantitative'},
        latitude2: {field: 'b2', type: 'quantitative'}
      });
    });

    it('should drop color channel if fill is specified', log.wrap((logger) => {
      const encoding = normalizeEncoding({
        color: {field: 'a', type: 'quantitative'},
        fill: {field: 'b', type: 'quantitative'}
      }, 'rule');

      assert.deepEqual(encoding, {
        fill: {field: 'b', type: 'quantitative'}
      });
      assert.equal(logger.warns[0], log.message.droppingColor('encoding', {fill: true}));
    }));

    it('should drop color channel if stroke is specified', log.wrap((logger) => {
      const encoding = normalizeEncoding({
        color: {field: 'a', type: 'quantitative'},
        stroke: {field: 'b', type: 'quantitative'}
      }, 'rule');

      assert.deepEqual(encoding, {
        stroke: {field: 'b', type: 'quantitative'}
      });
      assert.equal(logger.warns[0], log.message.droppingColor('encoding', {stroke: true}));
    }));
  });
  describe('extractTransformsFromEncoding', () => {
    it('should extract time unit from encoding field definition and add axis format', () => {
      const output = extractTransformsFromEncoding(normalizeEncoding({
        x: {timeUnit: 'yearmonthdatehoursminutes', field: 'a', type: 'temporal'},
        y: {field: 'b', type: 'quantitative'}
      }, 'line'), defaultConfig);
      assert.deepEqual(output, {
        bins: [],
        timeUnits: [{timeUnit: 'yearmonthdatehoursminutes', field: 'a', as: 'yearmonthdatehoursminutes_a'}],
        aggregate: [],
        groupby: ['yearmonthdatehoursminutes_a', 'b'],
        encoding: {
          x: {
            field: 'yearmonthdatehoursminutes_a',
            type: 'temporal',
            title: 'a (year-month-date-hours-minutes)',
            axis: {format: '%b %d, %Y %H:%M'}
          },
          y: {field: 'b', type: 'quantitative', title: 'b'}
        }
      });
    });
    it('should extract aggregates from encoding', () => {
      const output = extractTransformsFromEncoding(normalizeEncoding({
        x: {field: 'a', type: 'quantitative'},
        y: {
          aggregate: 'max',
          field: 'b',
          type: 'quantitative',
        }
      }, 'line'), defaultConfig);
      assert.deepEqual(output, {
        bins: [],
        timeUnits: [],
        aggregate: [{op: 'max', field: 'b', as: 'max_b'}],
        groupby: ['a'],
        encoding: {
          x: {field: 'a', type: 'quantitative', title: 'a'},
          y: {
            field: 'max_b', type: 'quantitative', title: 'Max of b',
          }
        }
      });
    });
    it('should extract binning from encoding', () => {
      const output = extractTransformsFromEncoding(normalizeEncoding({
        x: {field: 'a', type: 'ordinal', bin: true},
        y: {type: 'quantitative', aggregate: 'count'}
      }, 'bar'), defaultConfig);
      assert.deepEqual(output, {
        bins: [{bin: {maxbins: 10}, field: 'a', as: 'bin_maxbins_10_a'}],
        timeUnits: [],
        aggregate: [{op: 'count', field: undefined, as: 'count_*'}],
        groupby: ['bin_maxbins_10_a'],
        encoding: {
          x: {field: 'bin_maxbins_10_a', type: 'ordinal', title: 'a (binned)'},
          y: {field: 'count_*', type: 'quantitative', title: 'Number of Records'}
        }
      });
    });
    it('should preserve auxiliary properties (i.e. axis) in encoding', () => {
      const output = extractTransformsFromEncoding(normalizeEncoding({
        x: {field: 'a', type: 'quantitative'},
        y: {
          aggregate: 'mean',
          field: 'b',
          type: 'quantitative',
          axis: {title: 'foo', format: '.2e'}
        }
      }, 'line'), defaultConfig);
      assert.deepEqual(output, {
        bins: [],
        timeUnits: [],
        aggregate: [{op: 'mean', field: 'b', as: 'mean_b'}],
        groupby: ['a'],
        encoding: {
          x: {field: 'a', type: 'quantitative', title: 'a'},
          y: {
            field: 'mean_b', type: 'quantitative', title: 'Mean of b',
            axis: {title: 'foo', format: '.2e'}
          }
        }
      });
    });
  });
});
