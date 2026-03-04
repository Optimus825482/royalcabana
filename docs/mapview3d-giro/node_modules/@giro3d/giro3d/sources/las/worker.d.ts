/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import * as copc from 'copc';
import type { BaseMessageMap, Message, SuccessResponse } from '../../utils/WorkerPool';
import type { PointCloudAttribute } from '../PointCloudSource';
import type { DimensionFilter } from './filter';
export interface Metadata {
    pointCount: number;
    pointDataRecordFormat: number;
    pointDataRecordLength: number;
}
export type BoundingBox = [number, number, number, number, number, number];
export type MessageType = 'DecodeLazChunk' | 'DecodeLazFile' | 'ReadView' | 'SetWasmBinary';
interface TypedMessage<K extends MessageType, T> extends Message<T> {
    type: K;
}
type DecodeLazChunkMessage = TypedMessage<'DecodeLazChunk', {
    buffer: ArrayBufferLike;
    metadata: Metadata;
}>;
export interface ReadViewResult {
    position?: {
        buffer: ArrayBuffer;
        localBoundingBox: BoundingBox;
    };
    attributes: ArrayBuffer[];
}
type ReadViewMessage = TypedMessage<'ReadView', {
    buffer: ArrayBufferLike;
    metadata: Metadata;
    header: copc.Las.Extractor.PartialHeader;
    origin: {
        x: number;
        y: number;
        z: number;
    };
    eb?: copc.Las.ExtraBytes[];
    position: boolean;
    stride?: number;
    include?: string[];
    attributes: PointCloudAttribute[];
    filters?: DimensionFilter[];
    compressColors: boolean;
}>;
type DecodeLazFileMessage = TypedMessage<'DecodeLazFile', {
    buffer: ArrayBufferLike;
}>;
type DecodeLazChunkResponse = SuccessResponse<ArrayBufferLike>;
type DecodeLazFileResponse = SuccessResponse<ArrayBufferLike>;
type ReadViewResponse = SuccessResponse<ReadViewResult>;
export interface SetWasmBinaryMessage {
    type: 'SetWasmBinary';
    buffer: ArrayBuffer;
}
export interface MessageMap extends BaseMessageMap<MessageType> {
    DecodeLazChunk: {
        payload: DecodeLazChunkMessage['payload'];
        response: DecodeLazFileResponse['payload'];
    };
    DecodeLazFile: {
        payload: DecodeLazFileMessage['payload'];
        response: DecodeLazChunkResponse['payload'];
    };
    ReadView: {
        payload: ReadViewMessage['payload'];
        response: ReadViewResponse['payload'];
    };
}
export interface LazWorker extends Worker {
    postMessage(message: SetWasmBinaryMessage, options?: StructuredSerializeOptions): void;
    postMessage(message: SetWasmBinaryMessage, transfer: Transferable[]): void;
}
export declare function readView(options: {
    view: copc.View;
    origin: {
        x: number;
        y: number;
        z: number;
    };
    stride?: number;
    position: boolean;
    attributes: PointCloudAttribute[];
    filters?: DimensionFilter[];
    compressColors: boolean;
}): ReadViewResult;
export {};
//# sourceMappingURL=worker.d.ts.map