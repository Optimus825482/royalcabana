/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import { Matrix4, Ray, Vector2, Vector3 } from 'three';
import type Extent from './Extent';
import Coordinates from './Coordinates';
/**
 * A configurable spheroid that allows conversion from and to geodetic coordinates
 * and cartesian coordinates, as well as utility function to compute various geodetic values.
 */
export default class Ellipsoid {
    private readonly _semiMajor;
    private readonly _semiMinor;
    private readonly _sqEccentricity;
    private readonly _eccentricity;
    private readonly _equatorialCircumference;
    private readonly _invRadiiSquared;
    private readonly _radii;
    private readonly _flattening;
    get semiMajorAxis(): number;
    get semiMinorAxis(): number;
    /**
     * The [flattening](https://en.wikipedia.org/wiki/Flattening) of this ellipsoid.
     */
    get flattening(): number;
    /**
     * The circumference at the equator.
     */
    get equatorialCircumference(): number;
    /**
     * The [eccentricity](https://en.wikipedia.org/wiki/Eccentricity_(mathematics)) of this ellipsoid.
     */
    get eccentricity(): number;
    /**
     * The ratio between the semi-minor axis and the semi-major axis.
     */
    get compressionFactor(): number;
    constructor(params: {
        semiMajorAxis: number;
        semiMinorAxis: number;
    });
    /**
     * The [WGS 84](https://en.wikipedia.org/wiki/World_Geodetic_System#WGS84) ellipsoid.
     */
    static get WGS84(): Ellipsoid;
    /**
     * A sphere.
     */
    static sphere(radius: number): Ellipsoid;
    /**
     * Returns a new ellipsoid scaled by the specified factor.
     */
    scale(factor: number): Ellipsoid;
    /**
     * Returns a new ellipsoid growed by the specified offset. The offset is added to the axes.
     */
    grow(offset: number): Ellipsoid;
    /**
     * Converts the geodetic coordinates to cartesian coordinates in the ECEF coordinate system.
     * @param lat - The latitude, in degrees.
     * @param lon - The longitude, in degrees.
     * @param alt - The altitude, in meters, above or below the ellipsoid.
     * @param target - The target vector. If none, one will be created.
     * @returns The cartesian coordinates.
     */
    toCartesian(lat: number, lon: number, alt: number, target?: Vector3): Vector3;
    /**
     * Gets the ENU (east/north/up) matrix for the given location in geodetic coordinates.
     * @param point - The geodetic coordinate in the geocentric system of this ellipsoid.
     * @param target - The optional matrix to set with the ENU matrix.
     * @returns The ENU matrix.
     */
    getEastNorthUpMatrix(lat: number, lon: number, target?: Matrix4): Matrix4;
    /**
     * Gets the ENU (east/north/up) matrix for the given location.
     * @param point - The cartesian coordinate in the geocentric system of this ellipsoid.
     * @param target - The optional matrix to set with the ENU matrix.
     * @returns The ENU matrix.
     */
    getEastNorthUpMatrixFromCartesian(point: Readonly<Vector3>, target?: Matrix4): Matrix4;
    /**
     * Returns the first intersection of the ray with the ellipsoid, or `null` if the ray does not intersect the ellipsoid.
     * @param ray - The ray to intersect.
     * @param target - The optional vector to store the result.
     * @returns The intersection or null if not intersection was found.
     */
    intersectRay(ray: Ray, target?: Vector3): Vector3 | null;
    /**
     * Returns the normal of the spheroid for the given location.
     * @param lat - The latitude, in degrees.
     * @param lon - The longitude, in degrees.
     * @param target - The target vector to store the result. If none, one will be created.
     * @returns The normal vector.
     */
    getNormal(lat: number, lon: number, target?: Vector3): Vector3;
    /**
     * Returns the normal of the spheroid for the given cartesian coordinate.
     * @param cartesian - The cartesian coordinates.
     * @param target - The target vector to store the result. If none, one will be created.
     * @returns The normal vector.
     */
    getNormalFromCartesian(cartesian: Readonly<Vector3>, target?: Vector3): Vector3;
    /**
     * Converts the cartesian coordinates to geodetic coordinates.
     * @param x - The cartesian X coordinate.
     * @param y - The cartesian Y coordinate.
     * @param z - The cartesian Z coordinate.
     * @returns The geodetic coordinates.
     */
    toGeodetic(x: number, y: number, z: number, target?: Coordinates): Coordinates;
    /**
     * Returns the length of the parallel arc of the given angle, in meters.
     * @param latitude - The latitude of the parallel.
     * @param angle - The angle of the arc in degrees.
     */
    getParallelArcLength(latitude: number, angle: number): number;
    /**
     * Returns an approximated length of the meridian arc of the given angle, in meters.
     *
     * Note: this function uses a very simplified method, as the actual method involves
     * intrgrals. For very oblate spheroids, the results will be wrong.
     *
     * @param latitude0 - The latitude of the start of the meridian arc
     * @param latitude1 - The latitude of the end of the meridian arc
     */
    getMeridianArcLength(latitude0: number, latitude1: number): number;
    /**
     * Gets the dimensions (width and height) across the center of of the extent, in **meters**.
     *
     * Note: this is distinct to {@link Extent.dimensions} which returns the dimensions
     * in the extent's own CRS (meters or degrees).
     * @param extent - The extent.
     * @param target - The object to store the result. If none, one will be created.
     * @returns The extent dimensions.
     * @throws if the extent is not in the EPSG:4326 CRS.
     */
    getExtentDimensions(extent: Extent, target?: Vector2): Vector2;
    /**
     * Gets the distance to the horizon given a camera position.
     * @param cameraPosition - The camera position.
     * @param center - The center of the ellipsoid (by default (0, 0, 0)).
     * @returns The distance, in meters, from the camera to the horizon.
     */
    getOpticalHorizon(cameraPosition: Vector3, center?: Vector3): number | null;
    /**
     * Determine whether the given point is visible from the camera or occluded by the horizon
     * of this ellipsoid.
     * @param cameraPosition - The camera position, in world space coordinates.
     * @param point - The point to test, in world space coordinates.
     * @param radiusFactor - An optional factor to apply to ellipsoid radii to add a margin of error.
     * @returns `true` if the given point is above the horizon, `false` otherwise.
     */
    isHorizonVisible(cameraPosition: Vector3, point: Vector3, radiusFactor?: number): boolean;
}
//# sourceMappingURL=Ellipsoid.d.ts.map