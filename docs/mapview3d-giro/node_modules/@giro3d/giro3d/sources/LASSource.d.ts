/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import type { GetMemoryUsageContext } from '../core/MemoryUsage';
import type { CommonOptions } from './las/CommonOptions';
import type { GetNodeDataOptions, PointCloudMetadata, PointCloudNode, PointCloudNodeData } from './PointCloudSource';
import { type DimensionFilter } from './las/filter';
import { PointCloudSourceBase } from './PointCloudSource';
export type Getter = () => Promise<Uint8Array>;
export interface LASSourceOptions extends CommonOptions {
    /**
     * The URL to the remote LAS file, or a function to retrieve the remote file.
     */
    url: string | Getter;
}
/**
 * A source that reads from a LAS or LAZ file.
 *
 * **Note**: if you wish to read Cloud Optimized Point Cloud (COPC) LAZ files, use the COPCSource
 * instead.
 *
 * LAZ decompression is done in background threads using workers. If you wish to disable workers
 * (for a noticeable cost in performance), you can set {@link LASSourceOptions.enableWorkers} to
 * `false` in constructor options.
 *
 * Note: this source uses the **laz-perf** package to perform decoding of point cloud data. This
 * package uses WebAssembly. If you wish to override the path to the required .wasm file, use
 * {@link sources.las.config.setLazPerfPath | setLazPerfPath()} before using this source.
 * The default path is {@link sources.las.config.DEFAULT_LAZPERF_PATH | DEFAULT_LAZPERF_PATH}.
 *
 * ### Supported LAS version
 *
 * This source supports LAS 1.2 and 1.4 only.
 *
 * ### Decimation
 *
 * This source supports decimation. By passing the {@link LASSourceOptions.decimate} argument to
 * a value other than 1, every Nth point will be kept and other points will be discarded during
 * read operations.
 *
 * ### Dimensions filtering
 *
 * This source supports filtering over dimensions (also known as attributes). By providing filters
 * in the form of callback functions to apply to various dimensions, it is possible to eliminate
 * points during reads. For example, it is possible to remove unwanted classifications such as noise
 * from the output points.
 *
 * Note that dimension filtering is independent from the selected attribute. In other words, it is
 * possible to select the dimension `"Intensity"`, while filtering on dimensions `"Classification"`
 * and `"ReturnNumber"` for example.
 *
 * For example, if we wish to remove all points that have the dimension "High noise" (dimension 18
 * in the ASPRS classification list), as well as removing all points whose intensity is lower than
 * 1000:
 *
 * ```ts
 * const source = new LASSource(...);
 *
 * source.filters = [
 *  { dimension: 'Classification', filter: (val) => val !== 18 },
 *  { dimension: 'Intensity', filter: (val) => val >= 1000  },
 * ];
 * ```
 */
export default class LASSource extends PointCloudSourceBase {
    readonly isLASSource: true;
    readonly type: "LASSource";
    private readonly _getter;
    private readonly _opCounter;
    private readonly _filters;
    private readonly _options;
    private _header;
    private _volume;
    /** The buffer that stores the entire LAS/LAZ file (in compressed form for LAZ files). */
    private _buffer;
    get loading(): boolean;
    get progress(): number;
    /**
     * Gets or sets the dimension filters.
     * @defaultValue `[]`
     */
    get filters(): Readonly<DimensionFilter[]>;
    set filters(v: Readonly<DimensionFilter[]>);
    constructor(options: LASSourceOptions);
    protected initializeOnce(): Promise<this>;
    private getView;
    getMetadata(): Promise<PointCloudMetadata>;
    getHierarchy(): Promise<PointCloudNode>;
    getNodeData(params: GetNodeDataOptions): Promise<PointCloudNodeData>;
    getMemoryUsage(context: GetMemoryUsageContext): void;
    dispose(): void;
}
//# sourceMappingURL=LASSource.d.ts.map