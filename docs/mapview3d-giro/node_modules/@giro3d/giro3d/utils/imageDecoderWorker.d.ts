/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import type { TextureDataType, TypedArray } from 'three';
import type { BaseMessageMap, Message, SuccessResponse } from './WorkerPool';
export declare const OPAQUE_BYTE = 255;
export declare const OPAQUE_FLOAT = 1;
export declare const TRANSPARENT = 0;
export declare const DEFAULT_NODATA = 0;
export type TypedArrayType = 'Float32Array' | 'Float64Array' | 'Uint8ClampedArray' | 'Uint8Array' | 'Uint16Array' | 'Uint32Array' | 'Int8Array' | 'Int16Array' | 'Int32Array';
export interface CreatePixelBufferOptions {
    input: ArrayBuffer[];
    bufferSize: number;
    inputType: TypedArrayType;
    dataType: TextureDataType;
    nodata?: number;
    opaqueValue: number;
}
export interface CreatePixelBufferResult {
    buffer: ArrayBuffer;
    min: number;
    max: number;
    isTransparent: boolean;
}
export declare function getTypedArrayType(array: TypedArray): TypedArrayType;
export declare function createTypedArrayFromBuffer(buf: ArrayBuffer, type: TypedArrayType | TextureDataType): TypedArray;
export declare function createPixelBuffer(options: CreatePixelBufferOptions): CreatePixelBufferResult;
export interface CreatePixelBufferMessage extends Message<CreatePixelBufferOptions> {
    type: 'CreatePixelBuffer';
}
export type CreatePixelBufferResponse = SuccessResponse<CreatePixelBufferResult>;
export interface CreateImageBitmapMessage extends Message<{
    buffer: ArrayBuffer;
    options?: ImageBitmapOptions;
}> {
    type: 'CreateImageBitmap';
}
export type CreateImageBitmapMessageResponse = SuccessResponse<ImageBitmap>;
export type MessageType = 'CreateImageBitmap' | 'CreatePixelBuffer';
export interface MessageMap extends BaseMessageMap<MessageType> {
    CreatePixelBuffer: {
        payload: CreatePixelBufferMessage['payload'];
        response: CreatePixelBufferResponse['payload'];
    };
    CreateImageBitmap: {
        payload: CreateImageBitmapMessage['payload'];
        response: CreateImageBitmapMessageResponse['payload'];
    };
}
export type Messages = CreateImageBitmapMessage | CreatePixelBufferMessage;
//# sourceMappingURL=imageDecoderWorker.d.ts.map