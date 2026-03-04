/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import type { Box3, BufferGeometry, CanvasTexture, ColorRepresentation, DataTexture, Euler, InterleavedBufferAttribute, Light, Material, Matrix3, Matrix4, Mesh, MeshBasicMaterial, Object3D, OrthographicCamera, PerspectiveCamera, Quaternion, RenderTarget, ShaderMaterial, Texture, Vector2, Vector3, Vector4 } from 'three';
import type { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { Color } from 'three';
export declare function has<T>(obj: unknown, prop: keyof T): obj is T;
export declare const isObject: (obj: unknown) => obj is object;
export declare function isObject3D(obj: unknown): obj is Object3D;
export declare function isMesh(obj: unknown): obj is Mesh;
export declare function isLight(obj: unknown): obj is Light;
export declare function isBufferGeometry(obj: unknown): obj is BufferGeometry;
export declare function isInterleavedBufferAttribute(obj: unknown): obj is InterleavedBufferAttribute;
export declare function isTexture(obj: unknown): obj is Texture;
export declare function isQuaternion(obj: unknown): obj is Quaternion;
export declare function isEuler(obj: unknown): obj is Euler;
export declare function isMatrix3(obj: unknown): obj is Matrix3;
export declare function isMatrix4(obj: unknown): obj is Matrix4;
export declare function isRenderTarget(obj: unknown): obj is RenderTarget;
export declare function isDataTexture(obj: unknown): obj is DataTexture;
export declare function isCanvasTexture(obj: unknown): obj is CanvasTexture;
export declare function isPerspectiveCamera(obj: unknown): obj is PerspectiveCamera;
export declare function isOrthographicCamera(obj: unknown): obj is OrthographicCamera;
export declare function isMaterial(obj: unknown): obj is Material;
export declare function isColor(obj: unknown): obj is Color;
export declare function isVector2(obj: unknown): obj is Vector2;
export declare function isVector3(obj: unknown): obj is Vector3;
export declare function isVector4(obj: unknown): obj is Vector4;
export declare function isBox3(obj: unknown): obj is Box3;
export declare function isFiniteNumber(obj: unknown): obj is number;
export declare function getColor(input: ColorRepresentation): Color;
export declare function isShaderMaterial(obj: unknown): obj is ShaderMaterial;
export declare function isMeshBasicMaterial(obj: unknown): obj is MeshBasicMaterial;
export declare function isCSS2DObject(obj: unknown): obj is CSS2DObject;
//# sourceMappingURL=predicates.d.ts.map