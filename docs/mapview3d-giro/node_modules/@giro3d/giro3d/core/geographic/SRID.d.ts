/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
/**
 * Represents a spatial reference identifier (SRID).
 */
export default class SRID {
    private readonly _authority;
    private readonly _code;
    constructor(authority: string, code: number);
    /**
     * Parses an SRID in the form 'auth:code' (e.g EPSG:1234)
     * @param text - The text to parse.
     * @returns The parsed SRID, or throw an error if the SRID could not be parsed.
     */
    static parse(text: string): SRID;
    get authority(): string;
    get code(): number;
    toString(): string;
    isEpsg(code: number): boolean;
    tryGetEpsgCode(): number | null;
}
//# sourceMappingURL=SRID.d.ts.map