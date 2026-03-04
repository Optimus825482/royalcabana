/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */

import { Color } from 'three';
export function has(obj, prop) {
  if (obj == null) {
    return false;
  }
  return obj[prop] !== undefined;
}
export const isObject = obj => obj != null && typeof obj === 'object';
export function isObject3D(obj) {
  return isObject(obj) && obj.isObject3D === true;
}
export function isMesh(obj) {
  return isObject(obj) && obj.isMesh === true;
}
export function isLight(obj) {
  return isObject(obj) && obj.isLight === true;
}
export function isBufferGeometry(obj) {
  return isObject(obj) && obj.isBufferGeometry === true;
}
export function isInterleavedBufferAttribute(obj) {
  return isObject(obj) && obj.isInterleavedBufferAttribute === true;
}
export function isTexture(obj) {
  return isObject(obj) && obj.isTexture === true;
}
export function isQuaternion(obj) {
  return isObject(obj) && obj.isQuaternion === true;
}
export function isEuler(obj) {
  return isObject(obj) && obj.isEuler === true;
}
export function isMatrix3(obj) {
  return isObject(obj) && obj.isMatrix3 === true;
}
export function isMatrix4(obj) {
  return isObject(obj) && obj.isMatrix4 === true;
}
export function isRenderTarget(obj) {
  return isObject(obj) && obj.isRenderTarget === true;
}
export function isDataTexture(obj) {
  return isObject(obj) && obj.isDataTexture === true;
}
export function isCanvasTexture(obj) {
  return isObject(obj) && obj.isCanvasTexture === true;
}
export function isPerspectiveCamera(obj) {
  return isObject(obj) && obj.isPerspectiveCamera === true;
}
export function isOrthographicCamera(obj) {
  return isObject(obj) && obj.isOrthographicCamera === true;
}
export function isMaterial(obj) {
  return isObject(obj) && obj.isMaterial === true;
}
export function isColor(obj) {
  return isObject(obj) && obj.isColor === true;
}
export function isVector2(obj) {
  return isObject(obj) && obj.isVector2 === true;
}
export function isVector3(obj) {
  return isObject(obj) && obj.isVector3 === true;
}
export function isVector4(obj) {
  return isObject(obj) && obj.isVector4 === true;
}
export function isBox3(obj) {
  return isObject(obj) && obj.isBox3 === true;
}
export function isFiniteNumber(obj) {
  if (typeof obj === 'number' && Number.isFinite(obj)) {
    return true;
  }
  return false;
}
export function getColor(input) {
  if (isColor(input)) {
    return input;
  }
  return new Color(input);
}
export function isShaderMaterial(obj) {
  return isObject(obj) && obj.isShaderMaterial === true;
}
export function isMeshBasicMaterial(obj) {
  return isObject(obj) && obj.isMeshBasicMaterial === true;
}
export function isCSS2DObject(obj) {
  // @ts-expect-error property not present in types
  return isObject(obj) && obj.isCSS2DObject === true;
}