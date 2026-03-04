/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import { Vector2, Vector3 } from 'three';
import CoordinateSystem from './CoordinateSystem';
/**
 * A geographic coordinate expressed in degrees, minutes, seconds.
 */
export interface DMS {
    degrees: number;
    minutes?: number;
    seconds?: number;
}
export declare function parseDMS(dms: DMS): number;
/**
 * Possible values to set a `Coordinates` object.
 *
 * It can be:
 * - A pair of numbers for 2D coordinates [X, Y]
 * - A triplet of numbers for 3D coordinates [X, Y, Z]
 * - A THREE `Vector3`
 *
 * @example
 * new Coordinates(CoordinateSystem.epsg4978, 20885167, 849862, 23385912); //Geocentric coordinates
 * // or
 * new Coordinates(CoordinateSystem.epsg4978, new Vector3(20885167, 849862, 23385912)) // Same with a vector.
 * // or
 * new Coordinates(CoordinateSystem.epsg4326, 2.33, 48.24, 24999549); //Geographic coordinates
 */
export type CoordinateParameters = [number, number] | [number, number, number] | [Vector3];
/**
 * Represents coordinates associated with a coordinate reference system (CRS).
 */
declare class Coordinates {
    readonly isCoordinates: true;
    private readonly _values;
    crs: CoordinateSystem;
    /**
     * Build a {@link Coordinates} object, given a [CRS](http://inspire.ec.europa.eu/theme/rs) and a number of coordinates value.
     * Coordinates can be geocentric, geographic, or an instance of [Vector3](https://threejs.org/docs/#api/math/Vector3).
     * - If `crs` is `'EPSG:4326'`, coordinates must be in [geographic system](https://en.wikipedia.org/wiki/Geographic_coordinate_system).
     * - If `crs` is `'EPSG:4978'`, coordinates must be in [geocentric system](https://en.wikipedia.org/wiki/Earth-centered,_Earth-fixed_coordinate_system).
     *
     * @param crs - Geographic or Geocentric coordinates system.
     * @param coordinates - The coordinates.
     */
    constructor(crs: CoordinateSystem, ...coordinates: CoordinateParameters);
    get values(): Float64Array;
    set(crs: CoordinateSystem, ...coordinates: CoordinateParameters): this;
    clone(target?: Coordinates): Coordinates;
    copy(src: Coordinates): this;
    /**
     * Returns the longitude in geographic coordinates.
     * Coordinates must be in geographic system (can be
     * converted by using {@link as} ).
     *
     * ```js
     * const position = { longitude: 2.33, latitude: 48.24, altitude: 24999549 };
     * const coordinates = new Coordinates(
     *   'EPSG:4326', position.longitude, position.latitude, position.altitude); // Geographic
     * coordinates.longitude; // Longitude in geographic system
     * // returns 2.33
     *
     * // or
     *
     * const position = { x: 20885167, y: 849862, z: 23385912 };
     * // Geocentric system
     * const coords = new Coordinates(CoordinateSystem.epsg4978, position.x, position.y, position.z);
     * const coordinates = coords.as(CoordinateSystem.epsg4326);  // Geographic system
     * coordinates.longitude; // Longitude in geographic system
     * // returns 2.330201911389028
     * ```
     * @returns The longitude of the position.
     */
    get longitude(): number;
    /**
     * Returns the latitude in geographic coordinates.
     * Coordinates must be in geographic system (can be converted by using {@link as}).
     *
     * ```js
     * const position = { longitude: 2.33, latitude: 48.24, altitude: 24999549 };
     * const coordinates = new Coordinates(
     *     'EPSG:4326', position.longitude, position.latitude, position.altitude); // Geographic
     * coordinates.latitude; // Latitude in geographic system
     * // returns : 48.24
     *
     * // or
     *
     * const position = { x: 20885167, y: 849862, z: 23385912 };
     * // Geocentric system
     * const coords = new Coordinates(CoordinateSystem.epsg4978, position.x, position.y, position.z);
     * const coordinates = coords.as(CoordinateSystem.epsg4326);  // Geographic system
     * coordinates.latitude; // Latitude in geographic system
     * // returns : 48.24830764643365
     * ```
     * @returns The latitude of the position.
     */
    get latitude(): number;
    /**
     * Returns the altitude in geographic coordinates.
     * Coordinates must be in geographic system (can be converted by using {@link as}).
     *
     * ```js
     * const position = { longitude: 2.33, latitude: 48.24, altitude: 24999549 };
     * // Geographic system
     * const coordinates =
     *      new Coordinates(CoordinateSystem.epsg4326, position.longitude, position.latitude, position.altitude);
     * coordinates.altitude; // Altitude in geographic system
     * // returns : 24999549
     *
     * // or
     *
     * const position = { x: 20885167, y: 849862, z: 23385912 };
     * // Geocentric system
     * const coords = new Coordinates(CoordinateSystem.epsg4978, position.x, position.y, position.z);
     * const coordinates = coords.as(CoordinateSystem.epsg4326);  // Geographic system
     * coordinates.altitude; // Altitude in geographic system
     * // returns : 24999548.046711832
     * ```
     * @returns The altitude of the position.
     */
    get altitude(): number;
    /**
     * Set the altitude.
     *
     * @param altitude - the new altitude.
     * ```js
     * coordinates.setAltitude(10000)
     * ```
     */
    setAltitude(altitude: number): void;
    withLongitude(longitude: number | DMS): this;
    withLatitude(latitude: number | DMS): this;
    withCRS(crs: CoordinateSystem): this;
    withAltitude(altitude: number): this;
    /**
     * Returns the `x` component of this coordinate in geocentric coordinates.
     * Coordinates must be in geocentric system (can be
     * converted by using {@link as}).
     *
     * ```js
     * const position = { x: 20885167, y: 849862, z: 23385912 };
     * const coordinates = new Coordinates(CoordinateSystem.epsg4978, position.x, position.y, position.z);
     * coordinates.x;  // Geocentric system
     * // returns : 20885167
     *
     * // or
     *
     * const position = { longitude: 2.33, latitude: 48.24, altitude: 24999549 };
     * // Geographic system
     * const coords =
     *     new Coordinates(CoordinateSystem.epsg4326, position.longitude, position.latitude, position.altitude);
     * const coordinates = coords.as(CoordinateSystem.epsg4978); // Geocentric system
     * coordinates.x; // Geocentric system
     * // returns : 20888561.0301258
     * ```
     * @returns The `x` component of the position.
     */
    get x(): number;
    /**
     * Returns the `y` component of this coordinate in geocentric coordinates.
     * Coordinates must be in geocentric system (can be
     * converted by using {@link as}).
     *
     * ```js
     * const position = { x: 20885167, y: 849862, z: 23385912 };
     * const coordinates = new Coordinates(CoordinateSystem.epsg4978, position.x, position.y, position.z);
     * coordinates.y;  // Geocentric system
     * // returns :  849862
     * ```
     * @returns The `y` component of the position.
     */
    get y(): number;
    /**
     * Returns the `z` component of this coordinate in geocentric coordinates.
     * Coordinates must be in geocentric system (can be
     * converted by using {@link as}).
     *
     * ```js
     * const position = { x: 20885167, y: 849862, z: 23385912 };
     * const coordinates = new Coordinates(CoordinateSystem.epsg4978, position.x, position.y, position.z);
     * coordinates.z;  // Geocentric system
     * // returns :  23385912
     * ```
     * @returns The `z` component of the position.
     */
    get z(): number;
    /**
     * Returns the equivalent `Vector3` of this coordinate.
     *
     * ```js
     * const position = { x: 20885167, y: 849862, z: 23385912 };
     * // Geocentric system
     * const coordinates = new Coordinates(CoordinateSystem.epsg4978, position.x, position.y, position.z);
     * coordinates.toVector3();
     * // returns : Vector3
     * // x: 20885167
     * // y: 849862
     * // z: 23385912
     *
     * // or
     *
     * const position = { longitude: 2.33, latitude: 48.24, altitude: 24999549 };
     * // Geographic system
     * const coordinates =
     *      new Coordinates(CoordinateSystem.epsg4326, position.longitude, position.latitude, position.altitude);
     * coordinates.toVector3();
     * // returns : Vector3
     * // x: 2.33
     * // y: 48.24
     * // z: 24999549
     * ```
     * @param target - the geocentric coordinate
     * @returns target position
     */
    toVector3(target?: Vector3): Vector3;
    /**
     * Returns the equivalent `Vector2` of this coordinate. Note that the Z component (elevation) is
     * lost.
     *
     * ```js     *
     * const position = { x: 20885167, y: 849862, z: 23385912 };
     * // Metric system
     * const coordinates = new Coordinates(CoordinateSystem.epsg3857, position.x, position.y, position.z);
     * coordinates.toVector2();
     * // returns : Vector2
     * // x: 20885167
     * // y: 849862
     *
     * // or
     *
     * const position = { longitude: 2.33, latitude: 48.24, altitude: 24999549 };
     * // Geographic system
     * const coordinates =
     *      new Coordinates(CoordinateSystem.epsg4326, position.longitude, position.latitude, position.altitude);
     * coordinates.toVector2();
     * // returns : Vector2
     * // x: 2.33
     * // y: 48.24
     * ```
     * @param target - the geocentric coordinate
     * @returns target position
     */
    toVector2(target?: Vector2): Vector2;
    /**
     * Converts coordinates in another [CRS](http://inspire.ec.europa.eu/theme/rs).
     *
     * If target is not specified, creates a new instance.
     * The original instance is never modified (except if you passed it as `target`).
     *
     * ```js
     * const position = { longitude: 2.33, latitude: 48.24, altitude: 24999549 };
     * // Geographic system
     * const coords =
     *     new Coordinates(CoordinateSystem.epsg4326, position.longitude, position.latitude, position.altitude);
     * const coordinates = coords.as(CoordinateSystem.epsg4978); // Geocentric system
     * ```
     * @param crs - the [CRS](http://inspire.ec.europa.eu/theme/rs) EPSG string
     * @param target - the object that is returned
     * @returns the converted coordinate
     */
    as(crs: CoordinateSystem, target?: Coordinates): Coordinates;
    private convert;
    /**
     * Returns the boolean result of the check if this coordinate is geographic (true)
     * or geocentric (false).
     *
     * ```js
     * const position = { x: 20885167, y: 849862, z: 23385912 };
     * const coordinates = new Coordinates(CoordinateSystem.epsg4978, position.x, position.y, position.z);
     * coordinates.isGeographic();  // Geocentric system
     * // returns :  false
     * ```
     * @returns `true` if the coordinate is geographic.
     */
    isGeographic(): boolean;
    /**
     * Creates a geographic coordinate in EPSG:4326
     */
    static WGS84(latitude: number | DMS, longitude: number | DMS, altitude?: number): Coordinates;
}
export declare function isCoordinates(obj: unknown): obj is Coordinates;
export default Coordinates;
//# sourceMappingURL=Coordinates.d.ts.map