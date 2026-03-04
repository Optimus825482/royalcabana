/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */

import { isBufferGeometry, isMaterial, isMeshBasicMaterial, isShaderMaterial, isTexture } from '../utils/predicates';
import TextureGenerator from '../utils/TextureGenerator';

/**
 * Trait of objects that can report their memory usage.
 */

export function isMemoryUsage(obj) {
  return obj?.isMemoryUsage ?? false;
}
export function aggregateMemoryUsage(context) {
  let cpuMemory = 0;
  let gpuMemory = 0;
  context.objects.forEach(v => {
    cpuMemory += v.cpuMemory;
    gpuMemory += v.gpuMemory;
  });
  return {
    gpuMemory,
    cpuMemory
  };
}
export const KILOBYTE = 1024;
export const MEGABYTE = 1024 * KILOBYTE;
export const GIGABYTE = 1024 * MEGABYTE;

/**
 * Formats the byte count into a readable string.
 * @param bytes - The number of bytes.
 * @param locale - The locale parameter. Default is the current locale.
 * @returns A formatted string using either the specified locale, or the current locale.
 */
export function format(bytes, locale = undefined) {
  const numberFormat = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1
  });
  let unit;
  let value;
  if (bytes > GIGABYTE) {
    value = bytes / GIGABYTE;
    unit = 'GB';
  } else if (bytes > MEGABYTE) {
    value = bytes / MEGABYTE;
    unit = 'MB';
  } else if (bytes > KILOBYTE) {
    value = bytes / KILOBYTE;
    unit = 'KB';
  } else {
    value = bytes;
    unit = 'B';
  }
  return `${numberFormat.format(value)} ${unit}`;
}
function iterateMaterials(obj, callback) {
  const withMaterials = obj;
  if (withMaterials.material == null) {
    return;
  }
  if (isMaterial(withMaterials.material)) {
    callback(withMaterials.material);
  } else if (Array.isArray(withMaterials.material)) {
    for (const m of withMaterials.material) {
      if (isMaterial(m)) {
        callback(m);
      }
    }
  }
}
export function getObject3DMemoryUsage(context, object3d) {
  if ('geometry' in object3d && isBufferGeometry(object3d.geometry)) {
    getGeometryMemoryUsage(context, object3d.geometry);
  }
  iterateMaterials(object3d, material => {
    getMaterialMemoryUsage(context, material);
  });
}
export function getUniformMemoryUsage(context, uniform) {
  const value = uniform.value;
  if (isTexture(value)) {
    TextureGenerator.getMemoryUsage(context, value);
  }
}
export function getMaterialMemoryUsage(context, material) {
  if (isShaderMaterial(material)) {
    for (const uniform of Object.values(material.uniforms)) {
      getUniformMemoryUsage(context, uniform);
    }
  } else if (isMeshBasicMaterial(material)) {
    if (material.map) {
      TextureGenerator.getMemoryUsage(context, material.map);
    }
    // TODO other textures
  }
  // TODO other kinds of materials
}
export function getGeometryMemoryUsage(context, geometry) {
  let bytes = 0;
  for (const attributeName of Object.keys(geometry.attributes)) {
    bytes += geometry.getAttribute(attributeName).array.byteLength;
  }
  if (geometry.index) {
    bytes += geometry.index.array.byteLength;
  }
  context.objects.set(geometry.id, {
    cpuMemory: bytes,
    gpuMemory: bytes
  });
}