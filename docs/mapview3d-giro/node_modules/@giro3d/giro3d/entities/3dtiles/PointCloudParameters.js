/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */

/**
 * Maps attribute names found in the batch table with well-known names expected by Giro3D
 * for generating point cloud geometries and shader uniform names.
 *
 * Keys are well-known attributes, and values are attribute names in the batch table.
 *
 * ```
 * const customMapping = {
 *  'classification': 'THE_CATEGORY_OF_POINTS',
 *  'intensity': 'MY_CUSTOM_INTENSITY_VALUE'
 * }
 * ```
 */

export const DEFAULT_TILES3D_POINTCLOUD_ATTRIBUTE_MAPPING = {
  classification: 'classification',
  scalar: 'intensity'
};