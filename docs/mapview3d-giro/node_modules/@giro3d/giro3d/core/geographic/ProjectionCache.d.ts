/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import proj4 from 'proj4';
import type CoordinateSystem from './CoordinateSystem';
/**
 * Returns a coordinate converter from the specified source and destination CRSes.
 */
export declare function getConverter(crsIn: CoordinateSystem, crsOut: CoordinateSystem): proj4.Converter;
//# sourceMappingURL=ProjectionCache.d.ts.map