/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import SRID from './SRID';
import { LinearUnit, type Unit } from './Unit';
/**
 * Contains information about coordinate systems, as well as methods to register new coordinate systems.
 */
export default class CoordinateSystem {
    /**
     * The EPSG:3857 / pseudo-mercator coordinate systems.
     */
    static readonly epsg3857: CoordinateSystem;
    static readonly epsg4326: CoordinateSystem;
    static readonly epsg4978: CoordinateSystem;
    static readonly epsg4979: CoordinateSystem;
    /**
     * A special coordinate system used for spherical projections.
     */
    static readonly equirectangular: CoordinateSystem;
    static readonly unknown: CoordinateSystem;
    private static readonly _registry;
    /**
     * Registers a coordinate system with the underlying proj and OpenLayers libraries.
     *
     * Note: it is recommended to provide WKT definitions instead of proj strings, since
     * they provide more metadata about the CRS (such as name, SRID, etc).
     *
     * Note 2: some coordinate systems definitions (such as WKT 2's `COMPOUNDCRS`) are
     * not supported by the underlying proj library. However, if you are not planning
     * to use any feature of Giro3D that requires the proj library, you may ignore
     * failures and warnings.
     *
     * @param id - The id of the coordinate system.
     * @param definition - The WKT or proj definition.
     * @param options - Registration options.
     * @example
     * const wkt = `
     * PROJCS["RGF93 v1 / Lambert-93",
     *     GEOGCS["RGF93 v1",
     *         DATUM["Reseau_Geodesique_Francais_1993_v1",
     *             SPHEROID["GRS 1980",6378137,298.257222101],
     *             TOWGS84[0,0,0,0,0,0,0]],
     *         PRIMEM["Greenwich",0,
     *             AUTHORITY["EPSG","8901"]],
     *         UNIT["degree",0.0174532925199433,
     *             AUTHORITY["EPSG","9122"]],
     *         AUTHORITY["EPSG","4171"]],
     *     PROJECTION["Lambert_Conformal_Conic_2SP"],
     *     PARAMETER["latitude_of_origin",46.5],
     *     PARAMETER["central_meridian",3],
     *     PARAMETER["standard_parallel_1",49],
     *     PARAMETER["standard_parallel_2",44],
     *     PARAMETER["false_easting",700000],
     *     PARAMETER["false_northing",6600000],
     *     UNIT["metre",1,
     *         AUTHORITY["EPSG","9001"]],
     *     AXIS["Easting",EAST],
     *     AXIS["Northing",NORTH],
     *     AUTHORITY["EPSG","2154"]]
     * `;
     *
     * const crs = CoordinateSystem.register('EPSG:2154', wkt);
     * console.log(crs.name);
     * @returns A {@link CoordinateSystem} instance.
     */
    static register(
    /**
     * The ID of the coordinate system.
     */
    id: string, 
    /**
     * The WKT or proj definition.
     */
    definition: string, options?: {
        /**
         * If true, any error that occurs when registering the
         * coordinate system definition with proj4.js is re-thrown.
         * Otherwise, a simple warning is logged instead.
         */
        throwIfFailedToRegisterWithProj?: boolean;
    }): CoordinateSystem;
    /**
     * Mostly used for unit testing.
     * @internal
     */
    static clearRegistry(): void;
    /**
     * @param name - the short name, or EPSG code to identify this CRS.
     * @param value - the CRS definition, either in proj syntax, or in WKT syntax.
     */
    private static registerCRSWithProjAndOpenLayers;
    static get(srid: string): CoordinateSystem;
    /**
     * Creates a {@link CoordinateSystem} from its WKT definition.
     *
     * Note: this does not register the coordinate system with proj4.js. Use {@link register} instead.
     * @param wkt - The WKT 1 or WKT 2 definition.
     * @returns The created coordinate system, or throws an error if the definition could not be parsed.
     */
    static fromWkt(wkt: string, overrides?: {
        id?: string;
    }): CoordinateSystem;
    private readonly _customId?;
    /**
     * The readable name of this coordinate system.
     */
    readonly name: string;
    /**
     * The SRID of this coordinate system.
     */
    readonly srid?: SRID;
    /**
     * Contains metadata about the horizontal component of this coordinate system.
     */
    readonly horizontal?: {
        readonly unit: Unit;
    };
    /**
     * Contains metadata about the vertical component of this coordinate system.
     */
    readonly vertical?: {
        readonly unit: LinearUnit;
    };
    /**
     * The WKT definition of this coordinate system.
     */
    readonly definition?: string;
    /**
     * The internal identifier of this coordinate system. Used as a key in the coordinate system registry.
     * By order of priority, will return: the custom identifier, the SRID, then the name.
     */
    get id(): string;
    constructor(params: {
        /**
         * The name of the coordinate system.
         */
        name: string;
        /**
         * The optional SRID of this coordinate system.
         */
        srid?: SRID;
        /**
         * The id of this coordinate system. If unspecified, will use the SRID or name, if available.
         */
        id?: string;
        /**
         * The horizontal component of the coordinate system.
         */
        horizontal?: {
            unit: Unit;
        };
        /**
         * The vertical component of the coordinate system.
         */
        vertical?: {
            unit: LinearUnit;
        };
        /**
         * The WKT definition of the coordinate system.
         */
        definition?: string;
    });
    /**
     * Returns true if this coordinate system has angular units.
     */
    isGeographic(): boolean;
    /**
     * Returns the conversion factor between horizontal units and meters.
     */
    get metersPerHorizontalUnit(): number;
    /**
     * Returns the conversion factor between vertical units and meters.
     */
    get metersPerVerticalUnit(): number;
    isEpsg(code: number): boolean;
    /**
     * Returns `true` if this coordinate system is the special equirectangular coordinate system (used for spherical mapping).
     */
    isEquirectangular(): boolean;
    /**
     * Returns `true` if this coordinate system is the special unknown coordinate system (used for non-georeferenced scenes).
     */
    isUnknown(): boolean;
    /**
     * Returns `true` if the two coordinate systems are equal.
     */
    equals(other: CoordinateSystem): boolean;
}
//# sourceMappingURL=CoordinateSystem.d.ts.map