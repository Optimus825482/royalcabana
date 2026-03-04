/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */

// A dimension filter wrapped into an index accessor.
/** @internal */

/**
 * A filter that can be applied to dimensions to filter out unwanted points during processing.
 */

/**
 * For a given point index, evaluate all filters in series. Returns `true` if all filters return
 * `true`, otherwise returns `false`.
 */
export function evaluateFilters(filters, pointIndex) {
  if (filters == null || filters.length === 0) {
    return true;
  }
  return filters.every(f => f(pointIndex));
}
export function createPredicateFromFilter(filter) {
  const operator = filter.operator;
  switch (operator) {
    case 'equal':
      return x => x === filter.value;
    case 'less':
      return x => x < filter.value;
    case 'lessequal':
      return x => x <= filter.value;
    case 'greater':
      return x => x > filter.value;
    case 'greaterequal':
      return x => x >= filter.value;
    case 'not':
      return x => x !== filter.value;
    case 'in':
      return x => filter.values.has(x);
    case 'not_in':
      return x => !filter.values.has(x);
    default:
      throw new Error(`invalid filter operator: '${operator}'`);
  }
}

/**
 * For a given set of dimension filters, return an array of ready-to-use functions to apply to each
 * point being read.
 */
export function getPerPointFilters(filters, view) {
  if (filters.length === 0) {
    return null;
  }
  const result = [];
  for (const filter of filters) {
    const predicate = createPredicateFromFilter(filter);
    if (view.dimensions[filter.dimension] != null) {
      const getter = view.getter(filter.dimension);
      result.push(i => predicate(getter(i)));
    }
  }
  if (result.length > 0) {
    return result;
  }
  return null;
}