/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */

/**
 * Interface for an {@link entities.Entity3D | Entity3D} that implements picking.
 *
 * By default, Entity3D objects implement picking via Three.js raycasting.
 * Custom entities can implement this interface to provide an alternative picking
 * method via `pickAt`.
 *
 * This interface uses several generic types:
 * - `TResult` represents the type of results returned via picking with `pickAt`,
 * - `TOptions` can define additional options for picking directly on this entity
 *   or on its features.
 */

/**
 * Tests whether an object implements {@link Pickable}.
 *
 * @param obj - Object
 * @returns `true` if the object implements the interface.
 */
export const isPickable = obj => obj.isPickable;