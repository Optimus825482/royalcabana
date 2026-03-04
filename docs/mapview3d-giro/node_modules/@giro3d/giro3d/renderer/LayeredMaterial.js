/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */

import { Color, GLSL3, NoBlending, NormalBlending, RGBAFormat, ShaderMaterial, Uniform, UniformsLib, UnsignedByteType, Vector2, Vector3, Vector4 } from 'three';
import BlendingMode from '../core/layer/BlendingMode';
import OffsetScale from '../core/OffsetScale';
import Rect from '../core/Rect';
import Capabilities from '../core/system/Capabilities';
import { MapLightingMode } from '../entities/MapLightingOptions';
import { getColor } from '../utils/predicates';
import TextureGenerator from '../utils/TextureGenerator';
import { nonNull } from '../utils/tsutils';
import AtlasBuilder from './AtlasBuilder';
import WebGLComposer from './composition/WebGLComposer';
import EmptyTexture from './EmptyTexture';
import MaterialUtils from './MaterialUtils';
import MemoryTracker from './MemoryTracker';
import RenderingState from './RenderingState';
/* babel-plugin-inline-import './shader/TileFS.glsl' */
const TileFS = "#define LAMBERT\n\n#include <giro3d_precision_qualifiers>\n#include <giro3d_fragment_shader_header>\n#include <giro3d_common>\n\n#include <common>\n#include <packing>\n#include <dithering_pars_fragment>\n#include <lights_pars_begin>\n#include <lights_lambert_pars_fragment>\n#include <shadowmap_pars_fragment>\n\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\n#include <fog_pars_fragment>\n\n/**\n * Map tile fragment shader.\n */\n\n/**\n * Rendering states are modes that change the kind of data that the fragment shader outputs.\n * - FINAL : the FS outputs the regular object's color and aspect. This is the default.\n * - PICKING : the FS outputs (ID, Z, U, V) as Float32 color\n */\nconst int STATE_FINAL = 0;\nconst int STATE_PICKING = 1;\n\nvarying vec2        vUv; // The input UV\nvarying vec3        vWorldPosition; // The input world position\nvarying vec3        vWorldNormal;\nvarying vec3        vNormal;\n\n// For depth-based rendering (directional light shadow maps)\nvarying vec2        vHighPrecisionZW;\n\n// Distance-based rendering (point light shadow maps)\nuniform float       nearDistance;\nuniform float       farDistance;\nuniform vec3        referencePosition;\n\n#if defined(ENABLE_SKIRTS)\nvarying float       vIsSkirtVertex; // 1.0 if the vertex belongs to the skirt, 0.0 if it belongs to the top side\n#endif\n\nuniform int         renderingState; // Current rendering state (default is STATE_FINAL)\nuniform int         uuid;           // The ID of the tile mesh (used for the STATE_PICKING rendering state)\n\nuniform float       opacity;        // The entire map opacity\nuniform vec4        backgroundColor; // The background color\nuniform vec3        brightnessContrastSaturation; // Brightness/contrast/saturation for the entire map\n\nuniform vec4        extent; // The extent of the tile in local coordinates (e.g meters for cartesian, or degrees for geographic)\n\nuniform vec2        baseTextureSize; // The theoretical texture size of the tile (not the actual texture size of any texture)\n\n#include <giro3d_colormap_pars_fragment>\n#include <giro3d_outline_pars_fragment>\n#include <giro3d_graticule_pars_fragment>\n#include <giro3d_compose_layers_pars_fragment>\n#include <giro3d_contour_line_pars_fragment>\n#include <giro3d_hillshading_pars_fragment>\n\n#if defined(ENABLE_ELEVATION_RANGE)\nuniform vec2        elevationRange; // Optional elevation range for the whole tile. Not to be confused with elevation range per layer.\n#endif\n\nuniform vec2        tileDimensions; // The dimensions of the tile, in linear units (not degrees)\n\n#if defined(ELEVATION_LAYER)\nuniform sampler2D   elevationTexture;\nuniform LayerInfo   elevationLayer;\nuniform ColorMap    elevationColorMap;  // The elevation layer's optional color map\n#endif\n\nvoid applyDiffuse(vec3 diffuse, int mode) {\n    if (mode == HILLSHADE_SIMPLE) {\n        // Hillshading expects an sRGB color space, so we have to convert the color\n        // temporarily to sRGB, then back to sRGB-linear. Otherwise the result\n        // looks washed out and lacks contrast.\n        gl_FragColor = sRGBTransferOETF(gl_FragColor);\n        gl_FragColor.rgb *= diffuse;\n        gl_FragColor = sRGBToLinear(gl_FragColor);\n    } else {\n        // However in light-based lighting, we want to use exactly the same lighting\n        // model as the other shaders in three.js to avoid discrepancies\n        gl_FragColor.rgb *= diffuse;\n    }\n}\n\nvoid renderDistance() {\n    // Distance-based rendering for point light shadows\n    float dist = length( vWorldPosition - referencePosition );\n    dist = ( dist - nearDistance ) / ( farDistance - nearDistance );\n    dist = saturate( dist ); // clamp to [ 0, 1 ]\n    gl_FragColor = packDepthToRGBA( dist );\n}\nvec3 Z = vec3(0, 0, 1);\n\nvoid renderDepth() {\n    // Depth-based rendering for directional light shadows\n    // Higher precision equivalent of gl_FragCoord.z. This assumes depthRange has been left to its default values.\n    float fragCoordZ = 0.5 * vHighPrecisionZW[0] / vHighPrecisionZW[1] + 0.5;\n    gl_FragColor = packDepthToRGBA(fragCoordZ);\n}\n\nvoid renderBackface() {\n    if (!gl_FrontFacing) {\n        // Display the backside in a desaturated, darker tone, to give visual feedback that\n        // we are, in fact, looking at the map from the \"wrong\" side.\n        gl_FragColor.rgb = desaturate(gl_FragColor.rgb, 1.) * 0.5;\n    }\n\n}\n\n// Transforms the local normal to ENU (for Globes)\nvec3 transformENU(in vec3 normal, in vec3 localNormal) {\n    vec3 u = normal;\n    vec3 e = normalize(cross(Z, normal));\n    vec3 n = normalize(cross(u, e));\n\n    mat4 enu = transpose(mat4(\n        e.x, e.y, e.z, 0.0,\n        n.x, n.y, n.z, 0.0,\n        u.x, u.y, u.z, 0.0,\n        0.0, 0.0, 0.0, 1.0\n    ));\n\n    vec4 result = vec4(localNormal, 1.0) * enu;\n\n    return result.xyz;\n}\n\nvoid main() {\n    // Step 0 : discard fragment in trivial cases of transparency\n    if (opacity == 0.) {\n        return;\n    }\n\n    // Determine if the fragment belongs to the surface of the tile\n    // or not. If skirts are enabled, then fragments belonging to the\n    // sides or at the bottom are not part of the surface.\n    // In other words, the surface is all the fragments that point \"upward\"\n    bool isSurface = true;\n#if defined(ENABLE_SKIRTS)\n    if (vIsSkirtVertex > 0.0) {\n        isSurface = false;\n    }\n#endif\n\n    vec4 diffuseColor = vec4( 1, 1, 1, opacity );\n    #include <clipping_planes_fragment>\n\n    ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );\n\tvec3 totalEmissiveRadiance = vec3(0, 0, 0);\n\n    #include <logdepthbuf_fragment>\n\n    float height = 0.;\n\n#if defined(ELEVATION_LAYER)\n    vec2 elevUv = computeUv(vUv, elevationLayer.offsetScale.xy, elevationLayer.offsetScale.zw);\n    height = getElevation(elevationTexture, elevUv);\n#endif\n\n#if defined(ENABLE_ELEVATION_RANGE)\n    if (clamp(height, elevationRange.x, elevationRange.y) != height) {\n        discard;\n    }\n#endif\n\n    // Step 1 : discard fragment if the elevation texture is transparent\n#if defined(DISCARD_NODATA_ELEVATION)\n#if defined(ELEVATION_LAYER)\n    // Let's discard transparent pixels in the elevation texture\n    // Important note : if there is no elevation texture, all fragments are discarded\n    // because the default value for texture pixels is zero.\n    if (isNoData(elevationTexture, elevUv)) {\n        discard;\n    }\n#else\n    // No elevation layer present, discard completely.\n    discard;\n#endif\n#endif\n\n    // Step 2 : start with the background color\n    gl_FragColor = backgroundColor;\n\n#if defined(ELEVATION_LAYER)\n    // Step 3 : if the elevation layer has a color map, use it as the background color.\n    if (isSurface && elevationColorMap.mode != COLORMAP_MODE_DISABLED) {\n        vec4 rgba = computeColorMap(\n            tileDimensions,\n            elevationLayer,\n            elevationTexture,\n            elevationColorMap,\n            colorMapAtlas,\n            vUv);\n        gl_FragColor = blend(rgba, gl_FragColor);\n    }\n#endif\n\n    vec3 localNormal = vec3(0, 0, 1);\n\n#if defined(ELEVATION_LAYER)\n    vec2 df = computeElevationDerivatives(\n        tileDimensions,\n        elevUv,\n        elevationTexture,\n        hillshading.zFactor,\n        elevationLayer.offsetScale\n    );\n\n    localNormal = getNormalFromDerivatives(df.x, df.y);\n#endif\n\n#if defined(ENABLE_SKIRTS)\n    // Skirts have their own normal that must not be overriden by elevation sampling\n    if (!isSurface) {\n        localNormal = vWorldNormal;\n    }\n#endif\n\n    vec3 outgoingLight = vec3(1, 1, 1);\n\n// Apply shading but only if we are not performing shadow mapping\n// Since this shader is used to render both the \"normal\" aspect of the map\n// as well as shadow mapping, we have to be careful to exclude irrelevant\n// code from the shadow map code paths, both for performance and to avoid\n// nasty issue such as https://gitlab.com/giro3d/giro3d/-/issues/579\n#if defined(COLOR_RENDER)\n    if (hillshading.mode == HILLSHADE_SIMPLE) {\n        #if defined(ELEVATION_LAYER)\n        outgoingLight = hillshade(df, hillshading.zenith, hillshading.azimuth, hillshading.intensity);\n        #endif\n    } else if (hillshading.mode == HILLSHADE_PHYSICAL) {\n        #if defined(GLOBE)\n            // In globe mode, we have to convert the normal local to the surface\n            // to the world normal using an East/North/Up transformation matrix.\n            vec3 worldNormal = transformENU(vWorldNormal, localNormal);\n        #else\n            vec3 worldNormal = localNormal;\n        #endif\n\n        vec3 normal = (vec4(worldNormal.xyz, 1.0) * inverse(viewMatrix)).xyz;\n\n        #include <specularmap_fragment>\n        #include <lights_lambert_fragment>\n        #include <lights_fragment_begin>\n        #include <lights_fragment_maps>\n        #include <lights_fragment_end>\n\n        outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;\n    }\n#endif\n\n// Shading can be applied either:\n// - before the color layers (i.e only the background pixels will be shaded)\n// - or after the color layers (i.e all pixels will be shaded).\n#if defined(APPLY_SHADING_ON_COLORLAYERS)\n    // Do nothing\n#else\n    applyDiffuse(outgoingLight, hillshading.mode);\n#endif\n\n    // Step 4 : process all color layers (either directly sampling the atlas texture, or use a color map).\n    // Note: this was originally an included chunk (giro3d_compose_layers_pars_fragment), but due to\n    // the limitation described by https://github.com/mrdoob/three.js/issues/28020,\n    // we have to inline the code so that it can be patched from the material.\n#if defined(COLOR_RENDER)\n#if VISIBLE_COLOR_LAYER_COUNT\nif (isSurface) {\n    float maskOpacity = 1.;\n\n    LayerInfo layer;\n    ColorMap colorMap;\n    vec4 rgba;\n    vec4 blended;\n    vec2 range;\n\n    #pragma unroll_loop_start\n    for ( int i = 0; i < COLOR_LAYERS_LOOP_END; i++ ) {\n        layer = layers[UNROLLED_LOOP_INDEX];\n        if (layer.color.a > 0.) {\n            colorMap = layersColorMaps[UNROLLED_LOOP_INDEX];\n\n        // If we are using an atlas texture, then all color layers will get their pixels from this shared texture.\n        #if defined(USE_ATLAS_TEXTURE)\n            rgba = computeColorLayer(tileDimensions, atlasTexture, colorMapAtlas, layer, colorMap, vUv);\n        // Otherwise each color layer will get their pixels from their own texture.\n        #else\n            // We have to unroll the loop because we are accessing an array of samplers without a constant index (i.e UNROLLED_LOOP_INDEX)\n            rgba = computeColorLayer(tileDimensions, colorTextures[UNROLLED_LOOP_INDEX], colorMapAtlas, layer, colorMap, vUv);\n        #endif\n\n        // Let's blend the layer color to the composited color.\n        #if defined(ENABLE_LAYER_MASKS)\n            if (layer.mode == LAYER_MODE_MASK) {\n                // Mask layers do not contribute to the composition color.\n                // instead, they contribute to the overall opacity of the map.\n                maskOpacity *= rgba.a;\n                blended = gl_FragColor;\n            } else if (layer.mode == LAYER_MODE_MASK_INVERTED) {\n                maskOpacity *= (1. - rgba.a);\n                blended = gl_FragColor;\n            } else if (layer.mode == LAYER_MODE_NORMAL) {\n                blended = applyBlending(rgba, gl_FragColor, layer.blendingMode);\n            }\n        #else\n            blended = applyBlending(rgba, gl_FragColor, layer.blendingMode);\n        #endif\n\n#if defined(ENABLE_ELEVATION_RANGE)\n            range = layer.elevationRange;\n            if (clamp(height, range.x, range.y) == height) {\n                gl_FragColor = blended;\n            }\n#else\n            if (isSurface) {\n                gl_FragColor =  blended;\n            }\n#endif\n        }\n    }\n    #pragma unroll_loop_end\n\n    gl_FragColor.a *= maskOpacity;\n}\n#endif // VISIBLE_COLOR_LAYER_COUNT\n\n    if (gl_FragColor.a <= 0.0) {\n        discard;\n    }\n\n#if defined(ELEVATION_LAYER)\nif (isSurface) {\n    // Contour lines\n    #include <giro3d_contour_line_fragment>\n}\n#endif\n#endif // COLOR_RENDER\n\n#if defined(APPLY_SHADING_ON_COLORLAYERS)\n    applyDiffuse(outgoingLight, hillshading.mode);\n#endif\n\n    gl_FragColor.a *= opacity;\n\n#if defined(DEPTH_RENDER)\n\n    renderDepth();\n\n#elif defined(DISTANCE_RENDER)\n\n    renderDistance();\n\n#else\n\n    renderBackface();\n\nif (isSurface) {\n    // Step 7 : draw tile outlines\n    #include <giro3d_outline_fragment>\n\n    #include <giro3d_graticule_fragment>\n}\n\n    // Final step : process rendering states.\n    if (gl_FragColor.a <= 0.) {\n        // The fragment is transparent, discard it to short-circuit rendering state evaluation.\n        discard;\n    } else if (renderingState == STATE_FINAL) {\n        if (isSurface) {\n            gl_FragColor.rgb = adjustBrightnessContrastSaturation(gl_FragColor.rgb, brightnessContrastSaturation);\n        }\n        #include <colorspace_fragment>\n        #include <fog_fragment>\n        #include <premultiplied_alpha_fragment>\n        #include <dithering_fragment>\n    } else if (renderingState == STATE_PICKING) {\n        float id = float(uuid);\n        float z = height;\n        float u = vUv.x;\n        float v = vUv.y;\n        // Requires a float32 render target\n        gl_FragColor = vec4(id, z, u, v);\n    }\n#endif\n}\n";
/* babel-plugin-inline-import './shader/TileVS.glsl' */
const TileVS = "#include <giro3d_precision_qualifiers>\n#include <giro3d_common>\n#include <giro3d_terrain_pars_vertex>\n\n#include <common>\n#include <normal_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\n#include <fog_pars_vertex>\n#include <shadowmap_pars_vertex>\n\n// Outputs\nvarying vec2        vUv;\nvarying vec3        vWorldPosition; // World space position\nvarying vec3        vWorldNormal; // World space normal\nvarying vec3        vViewPosition;\n\n#if defined(ENABLE_SKIRTS)\nuniform float       skirtElevation;\nvarying float       vIsSkirtVertex;\n#endif\n\n// This is used for computing an equivalent of gl_FragCoord.z that is as high precision as possible.\n// Some platforms compute gl_FragCoord at a lower precision which makes the manually computed value better for\n// depth-based postprocessing effects. Reproduced on iPad with A10 processor / iPadOS 13.3.1.\nvarying vec2        vHighPrecisionZW;\n\nvoid main() {\n    vUv = uv;\n\n\t#include <beginnormal_vertex>\n\t#include <morphnormal_vertex>\n\t#include <skinbase_vertex>\n\t#include <skinnormal_vertex>\n\t#include <defaultnormal_vertex>\n\t#include <normal_vertex>\n\n    #include <begin_vertex>\n\n    #include <giro3d_terrain_vertex>\n    #include <project_vertex>\n    #include <logdepthbuf_vertex>\n    #include <clipping_planes_vertex>\n\n    vWorldNormal = normal;\n    vViewPosition = -mvPosition.xyz;\n\n    #include <worldpos_vertex>\n    #include <shadowmap_vertex>\n    #include <fog_vertex>\n\n    vWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;\n    vHighPrecisionZW = gl_Position.zw;\n\n#if defined(ENABLE_SKIRTS)\n    vIsSkirtVertex = gl_VertexID >= int(skirtVertexRange[0]) && gl_VertexID <= int(skirtVertexRange[1]) ? 1.0 : 0.0;\n#endif\n}\n";
const EMPTY_IMAGE_SIZE = 16;
const tmpDims = new Vector2();
const emptyTexture = new EmptyTexture();
const COLORMAP_DISABLED = 0;
const DISABLED_ELEVATION_RANGE = new Vector2(-999999, 999999);
class TextureInfo {
  constructor(layer) {
    this.layer = layer;
    this.opacity = layer.opacity;
    this.visible = layer.visible;
    this.offsetScale = new OffsetScale(0, 0, 0, 0);
    this.originalOffsetScale = new OffsetScale(0, 0, 0, 0);
    this.texture = emptyTexture;
    this.color = new Color(1, 1, 1);
    this.brightnessContrastSaturation = new Vector3(0, 1, 1);
  }
  get mode() {
    return this.layer.maskMode ?? 0;
  }
}
export const DEFAULT_OUTLINE_COLOR = 'red';
export const DEFAULT_HILLSHADING_INTENSITY = 1;
export const DEFAULT_HILLSHADING_ZFACTOR = 1;
export const DEFAULT_AZIMUTH = 135;
export const DEFAULT_ZENITH = 45;
export const DEFAULT_GRATICULE_COLOR = new Color(0, 0, 0);
export const DEFAULT_GRATICULE_STEP = 500; // meters
export const DEFAULT_GRATICULE_THICKNESS = 1;
export const DEFAULT_SUN_DIRECTION = new Vector3(1, 0, 0);
function drawImageOnAtlas(width, height, composer, atlasInfo, texture) {
  const dx = atlasInfo.x;
  const dy = atlasInfo.y + nonNull(atlasInfo.offset);
  const rect = new Rect(dx, dx + width, dy, dy + height);
  composer.draw(texture, rect);
}
function updateOffsetScale(imageSize, atlas, originalOffsetScale, width, height, target) {
  if (originalOffsetScale.z === 0 || originalOffsetScale.w === 0) {
    target.set(0, 0, 0, 0);
    return;
  }
  // compute offset / scale
  const xRatio = imageSize.width / width;
  const yRatio = imageSize.height / height;
  target.set(atlas.x / width + originalOffsetScale.x * xRatio, (atlas.y + nonNull(atlas.offset)) / height + originalOffsetScale.y * yRatio, originalOffsetScale.z * xRatio, originalOffsetScale.w * yRatio);
}
function repeat(value, count) {
  const result = new Array(count);
  for (let i = 0; i < count; i++) {
    result[i] = {
      ...value
    };
  }
  return result;
}
var InternalShadingMode = /*#__PURE__*/function (InternalShadingMode) {
  InternalShadingMode[InternalShadingMode["Disabled"] = 0] = "Disabled";
  InternalShadingMode[InternalShadingMode["Simple"] = 1] = "Simple";
  InternalShadingMode[InternalShadingMode["Realistic"] = 2] = "Realistic";
  return InternalShadingMode;
}(InternalShadingMode || {});
function mapLightingMode(input) {
  if (input.enabled !== true) {
    return InternalShadingMode.Disabled;
  }
  if (input.mode === MapLightingMode.LightBased) {
    return InternalShadingMode.Realistic;
  }
  return InternalShadingMode.Simple;
}
class LayeredMaterial extends ShaderMaterial {
  isMemoryUsage = true;

  // Used for point-light shadow maps

  _colorLayers = [];
  _elevationLayer = null;
  _mustUpdateUniforms = true;
  _needsSorting = true;
  _needsAtlasRepaint = false;
  _composer = null;
  _colorMapAtlas = null;
  _composerDataType = UnsignedByteType;
  defines = {
    VISIBLE_COLOR_LAYER_COUNT: 0
  };
  getMemoryUsage(context) {
    // We only consider textures that this material owns. That excludes layer textures.
    const atlas = this._texturesInfo.color.atlasTexture;
    if (atlas) {
      TextureGenerator.getMemoryUsage(context, atlas);
    }
  }
  constructor(params) {
    super({
      clipping: true,
      glslVersion: GLSL3
    });
    this._atlasInfo = {
      maxX: 0,
      maxY: 0,
      atlas: null
    };
    this._textureSize = params.textureSize;
    this.fog = true;
    this._maxTextureImageUnits = params.maxTextureImageUnits;
    this._getIndexFn = params.getIndexFn;
    const options = params.options;
    MaterialUtils.setDefine(this, 'USE_ATLAS_TEXTURE', false);
    MaterialUtils.setDefine(this, 'STITCHING', options.terrain.stitching);
    MaterialUtils.setDefine(this, 'GLOBE', params.isGlobe);
    MaterialUtils.setDefine(this, 'TERRAIN_DEFORMATION', options.terrain.enabled);
    MaterialUtils.setDefine(this, 'DISCARD_NODATA_ELEVATION', options.discardNoData);
    MaterialUtils.setDefine(this, 'ENABLE_ELEVATION_RANGE', options.elevationRange != null);
    MaterialUtils.setDefineValue(this, 'VISIBLE_COLOR_LAYER_COUNT', 0);
    MaterialUtils.setDefine(this, 'COLOR_RENDER', true);
    this.fragmentShader = TileFS;
    this.vertexShader = TileVS;
    this._texturesInfo = {
      color: {
        infos: [],
        atlasTexture: null
      },
      elevation: {
        offsetScale: new OffsetScale(0, 0, 0, 0),
        texture: null
      }
    };
    this.side = options.side;
    this.lights = true;
    this._renderer = params.renderer;
    this._forceTextureAtlas = options.forceTextureAtlases ?? false;
    this._composerDataType = params.textureDataType;
    this._colorMapAtlas = options.colorMapAtlas ?? null;
    const elevationRange = options.elevationRange ? new Vector2(options.elevationRange.min, options.elevationRange.max) : DISABLED_ELEVATION_RANGE;
    const elevInfo = this._texturesInfo.elevation;
    const extent = params.extent;
    const {
      width,
      height
    } = extent.dimensions(tmpDims);
    this.uniforms = {
      // Automatically updated by THREE.js
      ...UniformsLib.common,
      ...UniformsLib.lights,
      ...UniformsLib.fog,
      // Uniforms for point light shadow maps
      referencePosition: new Uniform(new Vector3()),
      nearDistance: new Uniform(1),
      farDistance: new Uniform(1000),
      uuid: new Uniform(0),
      baseTextureSize: new Uniform(this._textureSize),
      hillshading: new Uniform({
        mode: mapLightingMode(options.lighting),
        zenith: DEFAULT_ZENITH,
        azimuth: DEFAULT_AZIMUTH,
        intensity: DEFAULT_HILLSHADING_INTENSITY,
        zFactor: DEFAULT_HILLSHADING_ZFACTOR
      }),
      renderingState: new Uniform(RenderingState.FINAL),
      extent: new Uniform(new Vector4(extent.west, extent.south, width, height)),
      tileDimensions: new Uniform(params.tileDimensions),
      segments: new Uniform(options.terrain.segments ?? 8),
      neighbours: new Uniform(repeat({
        diffLevel: 0,
        offsetScale: null
      }, 8)),
      neighbourTextures: new Uniform([null, null, null, null, null, null, null, null]),
      elevationRange: new Uniform(elevationRange),
      graticule: new Uniform({
        color: new Vector4(0, 0, 0, 1),
        thickness: DEFAULT_GRATICULE_THICKNESS,
        position: new Vector4(0, 0, DEFAULT_GRATICULE_STEP, DEFAULT_GRATICULE_STEP)
      }),
      contourLines: new Uniform({
        thickness: 1,
        primaryInterval: 100,
        secondaryInterval: 20,
        color: new Vector4(0, 0, 0, 1)
      }),
      backgroundColor: new Uniform(new Vector4()),
      tileOutlineColor: new Uniform(new Color(DEFAULT_OUTLINE_COLOR)),
      brightnessContrastSaturation: new Uniform(new Vector3(0, 1, 1)),
      colorMapAtlas: new Uniform(null),
      layersColorMaps: new Uniform([]),
      elevationColorMap: new Uniform({
        mode: 0,
        offset: 0,
        max: 0,
        min: 0
      }),
      elevationScaling: new Uniform(1),
      elevationTexture: new Uniform(elevInfo.texture),
      atlasTexture: new Uniform(this._texturesInfo.color.atlasTexture),
      colorTextures: new Uniform([]),
      // Describe the properties of each color layer (offsetScale, color...).
      layers: new Uniform([]),
      elevationLayer: new Uniform({
        brightnessContrastSaturation: new Vector3(0, 1, 1),
        color: new Vector4(0, 0, 0, 0),
        elevationRange: new Vector2(0, 0),
        offsetScale: new OffsetScale(0, 0, 0, 0),
        textureSize: new Vector2(0, 0),
        blendingMode: BlendingMode.None,
        mode: 0
      }),
      skirtVertexRange: new Uniform(new Vector2(0, 0)),
      skirtElevation: new Uniform(0)
    };
    this.uniformsNeedUpdate = true;
    this.update(options);
    MemoryTracker.track(this, 'LayeredMaterial');
  }

  /**
   * @param v - The number of segments.
   */
  set segments(v) {
    this.uniforms.segments.value = v;
  }
  updateNeighbour(neighbour, diffLevel, offsetScale, texture) {
    this.uniforms.neighbours.value[neighbour].diffLevel = diffLevel;
    this.uniforms.neighbours.value[neighbour].offsetScale = offsetScale;
    this.uniforms.neighbourTextures.value[neighbour] = texture;
  }
  setElevationScaling(scaling) {
    this.uniforms.elevationScaling.value = scaling;
  }
  onBeforeCompile(parameters) {
    // This is a workaround due to a limitation in three.js, documented
    // here: https://github.com/mrdoob/three.js/issues/28020
    // Normally, we would not have to do this and let the loop unrolling do its job.
    // However, in our case, the loop end index is not an integer, but a define.
    // We have to patch the fragment shader ourselves because three.js will not do it
    // before the loop is unrolled, leading to a compilation error.
    parameters.fragmentShader = parameters.fragmentShader.replaceAll('COLOR_LAYERS_LOOP_END', `${this.defines.VISIBLE_COLOR_LAYER_COUNT}`);
  }
  updateColorLayerUniforms() {
    const useAtlas = this.defines.USE_ATLAS_TEXTURE === 1;
    this.sortLayersIfNecessary();
    if (this._mustUpdateUniforms) {
      const layersUniform = [];
      const infos = this._texturesInfo.color.infos;
      const textureUniforms = this.uniforms.colorTextures.value;
      textureUniforms.length = 0;
      for (const info of infos) {
        const layer = info.layer;
        // Ignore non-visible layers
        if (!layer.visible) {
          continue;
        }

        // If we use an atlas, the offset/scale is different.
        const offsetScale = useAtlas ? info.offsetScale : info.originalOffsetScale;
        const tex = info.texture;
        let textureSize = new Vector2(0, 0);
        const image = tex.image;
        if (image != null) {
          textureSize = new Vector2(image.width, image.height);
        }
        const rgb = info.color;
        const a = info.visible ? info.opacity : 0;
        const color = new Vector4(rgb.r, rgb.g, rgb.b, a);
        const elevationRange = info.elevationRange || DISABLED_ELEVATION_RANGE;
        const uniform = {
          offsetScale,
          color,
          textureSize,
          elevationRange,
          mode: info.mode,
          blendingMode: layer.blendingMode,
          brightnessContrastSaturation: info.brightnessContrastSaturation
        };
        layersUniform.push(uniform);
        if (!useAtlas) {
          textureUniforms.push(tex);
        }
      }
      this.uniforms.layers.value = layersUniform;
    }
  }
  dispose() {
    this.dispatchEvent({
      type: 'dispose'
    });
    for (const layer of this._colorLayers) {
      const index = this.indexOfColorLayer(layer);
      if (index === -1) {
        continue;
      }
      delete this._texturesInfo.color.infos[index];
    }
    this._colorLayers.length = 0;
    this._composer?.dispose();
    this._texturesInfo.color.atlasTexture?.dispose();
  }
  getColorTexture(layer) {
    const index = this.indexOfColorLayer(layer);
    if (index === -1) {
      return null;
    }
    return this._texturesInfo.color.infos[index].texture;
  }
  countIndividualTextures() {
    let totalTextureUnits = 0;
    if (this._elevationLayer) {
      totalTextureUnits++;
      if (this.defines.STITCHING) {
        // We use 8 neighbour textures for stit-ching
        totalTextureUnits += 8;
      }
    }
    if (this._colorMapAtlas) {
      totalTextureUnits++;
    }
    const visibleColorLayers = this.getVisibleColorLayerCount();
    // Count only visible color layers
    totalTextureUnits += visibleColorLayers;
    return {
      totalTextureUnits,
      visibleColorLayers
    };
  }
  onBeforeRender() {
    this.updateOpacityParameters(this.opacity);
    if (this.defines.USE_ATLAS_TEXTURE && this._needsAtlasRepaint) {
      this.repaintAtlas();
      this._needsAtlasRepaint = false;
    }
    this.updateColorWrite();
    this.updateColorLayerUniforms();
    this.updateColorMaps();
  }

  /**
   * Determine if this material should write to the color buffer.
   */
  updateColorWrite() {
    if (this._texturesInfo.elevation.texture == null && this.defines.DISCARD_NODATA_ELEVATION) {
      // No elevation texture means that every single fragment will be discarded,
      // which is an illegal operation in WebGL (raising warnings).
      this.colorWrite = false;
    } else {
      this.colorWrite = true;
    }
  }
  repaintAtlas() {
    this.rebuildAtlasIfNecessary();
    const composer = nonNull(this._composer);
    composer.clear();

    // Redraw all visible color layers on the canvas
    for (const l of this._colorLayers) {
      if (!l.visible) {
        continue;
      }
      const idx = this.indexOfColorLayer(l);
      const atlas = nonNull(this._atlasInfo.atlas)[l.id];
      const layerTexture = this._texturesInfo.color.infos[idx].texture;
      const w = layerTexture?.image?.width ?? EMPTY_IMAGE_SIZE;
      const h = layerTexture?.image?.height ?? EMPTY_IMAGE_SIZE;
      updateOffsetScale(new Vector2(w, h), atlas, this._texturesInfo.color.infos[idx].originalOffsetScale, this.composerWidth, this.composerHeight, this._texturesInfo.color.infos[idx].offsetScale);
      if (layerTexture != null) {
        drawImageOnAtlas(w, h, nonNull(composer), atlas, layerTexture);
      }
    }
    const rendered = composer.render();
    rendered.name = 'LayeredMaterial - Atlas';
    MemoryTracker.track(rendered, rendered.name);

    // Even though we asked the composer to reuse the same texture, sometimes it has
    // to recreate a new texture when some parameters change, such as pixel format.
    if (rendered.uuid !== this._texturesInfo.color.atlasTexture?.uuid) {
      this.rebuildAtlasTexture(rendered);
    }
    this.uniforms.atlasTexture.value = this._texturesInfo.color.atlasTexture;
  }
  setColorTextures(layer, textureAndPitch) {
    const index = this.indexOfColorLayer(layer);
    if (index < 0) {
      this.pushColorLayer(layer);
    }
    const {
      pitch,
      texture
    } = textureAndPitch;
    this._texturesInfo.color.infos[index].originalOffsetScale.copy(pitch);
    this._texturesInfo.color.infos[index].texture = texture;
    const currentSize = TextureGenerator.getBytesPerChannel(this._composerDataType);
    const textureSize = TextureGenerator.getBytesPerChannel(texture.type);
    if (textureSize > currentSize) {
      // The new layer uses a bigger data type, we need to recreate the atlas
      this._composerDataType = texture.type;
    }
    this._needsAtlasRepaint = true;
  }
  pushElevationLayer(layer) {
    this._elevationLayer = layer;
  }
  removeElevationLayer() {
    this._elevationLayer = null;
    this.uniforms.elevationTexture.value = null;
    this._texturesInfo.elevation.texture = null;
    MaterialUtils.setDefine(this, 'ELEVATION_LAYER', false);
  }
  setElevationTexture(layer, {
    texture,
    pitch
  }) {
    this._elevationLayer = layer;
    MaterialUtils.setDefine(this, 'ELEVATION_LAYER', true);
    this.uniforms.elevationTexture.value = texture;
    this._texturesInfo.elevation.texture = texture;
    this._texturesInfo.elevation.offsetScale.copy(pitch);
    const uniform = this.uniforms.elevationLayer.value;
    uniform.offsetScale = pitch;
    uniform.textureSize = new Vector2(texture.image.width, texture.image.height);
    uniform.color = new Vector4(1, 1, 1, 1);
    uniform.brightnessContrastSaturation = new Vector3(1, 1, 1);
    uniform.elevationRange = new Vector2();
    this.updateColorMaps();
  }
  rebuildAtlasInfo() {
    const colorLayers = this._colorLayers;

    // rebuild color textures atlas
    // We use a margin to prevent atlas bleeding.
    const margin = 1.1;
    const {
      width,
      height
    } = this._textureSize;
    const {
      atlas,
      maxX,
      maxY
    } = AtlasBuilder.pack(Capabilities.getMaxTextureSize(), colorLayers.map(l => ({
      id: l.id,
      size: new Vector2(Math.round(width * l.resolutionFactor * margin), Math.round(height * l.resolutionFactor * margin))
    })), this._atlasInfo.atlas);
    this._atlasInfo.atlas = atlas;
    this._atlasInfo.maxX = Math.max(this._atlasInfo.maxX, maxX);
    this._atlasInfo.maxY = Math.max(this._atlasInfo.maxY, maxY);
  }
  pushColorLayer(newLayer) {
    if (this._colorLayers.includes(newLayer)) {
      return;
    }
    this._colorLayers.push(newLayer);
    const info = new TextureInfo(newLayer);
    if (newLayer.type === 'MaskLayer') {
      MaterialUtils.setDefine(this, 'ENABLE_LAYER_MASKS', true);
    }
    this.rebuildAtlasInfo();

    // Optional feature: limit color layer display within an elevation range
    if (newLayer.elevationRange != null) {
      MaterialUtils.setDefine(this, 'ENABLE_ELEVATION_RANGE', true);
      const {
        min,
        max
      } = newLayer.elevationRange;
      info.elevationRange = new Vector2(min, max);
    }
    this._texturesInfo.color.infos.push(info);
    this.updateColorLayerCount();
    this.updateColorMaps();
    this.needsUpdate = true;
  }
  getVisibleColorLayerCount() {
    let result = 0;
    for (let i = 0; i < this._colorLayers.length; i++) {
      const layer = this._colorLayers[i];
      if (layer.visible) {
        result++;
      }
    }
    return result;
  }
  reorderLayers() {
    this._needsSorting = true;
  }
  sortLayersIfNecessary() {
    const idx = this._getIndexFn;
    if (this._needsSorting) {
      this._colorLayers.sort((a, b) => idx(a) - idx(b));
      this._texturesInfo.color.infos.sort((a, b) => idx(a.layer) - idx(b.layer));
      this._needsSorting = false;
    }
  }
  removeColorLayer(layer) {
    const index = this.indexOfColorLayer(layer);
    if (index === -1) {
      return;
    }
    // NOTE: we cannot dispose the texture here, because it might be cached for later.
    this._texturesInfo.color.infos.splice(index, 1);
    this._colorLayers.splice(index, 1);
    this.updateColorMaps();
    this.rebuildAtlasInfo();
    this.updateColorLayerCount();
  }

  /**
   * Sets the colormap atlas.
   *
   * @param atlas - The atlas.
   */
  setColorMapAtlas(atlas) {
    this._colorMapAtlas = atlas;
  }
  updateColorMaps() {
    this.sortLayersIfNecessary();
    const atlas = this._colorMapAtlas;
    const elevationColorMap = this._elevationLayer?.colorMap;
    const elevationUniform = this.uniforms.elevationColorMap;
    if (elevationColorMap?.active === true) {
      elevationUniform.value.mode = elevationColorMap?.mode ?? COLORMAP_DISABLED;
      elevationUniform.value.min = elevationColorMap?.min ?? 0;
      elevationUniform.value.max = elevationColorMap?.max ?? 0;
      elevationUniform.value.offset = atlas?.getOffset(elevationColorMap) ?? 0;
    } else {
      elevationUniform.value.mode = COLORMAP_DISABLED;
      elevationUniform.value.min = 0;
      elevationUniform.value.max = 0;
    }
    const colorLayers = this._texturesInfo.color.infos;
    const uniforms = [];
    for (let i = 0; i < colorLayers.length; i++) {
      const texInfo = colorLayers[i];
      if (!texInfo.layer.visible) {
        continue;
      }
      const colorMap = texInfo.layer.colorMap;
      const uniform = {
        mode: colorMap?.active === true ? colorMap.mode : COLORMAP_DISABLED,
        min: colorMap?.min ?? 0,
        max: colorMap?.max ?? 0,
        offset: colorMap ? atlas?.getOffset(colorMap) ?? 0 : 0
      };
      uniforms.push(uniform);
    }
    this.uniforms.layersColorMaps = new Uniform(uniforms);
    if (atlas?.texture) {
      const luts = atlas.texture ?? null;
      this.uniforms.colorMapAtlas.value = luts;
    }
  }
  updateGraticuleUniforms(opts) {
    const graticule = opts.graticule;
    const enabled = graticule.enabled ?? false;
    MaterialUtils.setDefine(this, 'ENABLE_GRATICULE', enabled);
    if (enabled) {
      const uniform = this.uniforms.graticule.value;
      uniform.thickness = graticule.thickness;
      uniform.position.set(graticule.xOffset, graticule.yOffset, graticule.xStep, graticule.yStep);
      const rgb = getColor(graticule.color);
      uniform.color.set(rgb.r, rgb.g, rgb.b, graticule.opacity ?? 0);
    }
  }
  updateContourLineUniforms(opts) {
    const contourLines = opts.contourLines;
    if (contourLines.enabled) {
      const c = getColor(contourLines.color);
      const a = contourLines.opacity;
      this.uniforms.contourLines.value = {
        thickness: contourLines.thickness ?? 1,
        primaryInterval: contourLines.interval ?? 100,
        secondaryInterval: contourLines.secondaryInterval ?? 0,
        color: new Vector4(c.r, c.g, c.b, a)
      };
    }
    MaterialUtils.setDefine(this, 'ENABLE_CONTOUR_LINES', contourLines.enabled);
  }
  updateColorUniforms(opts) {
    const a = opts.backgroundOpacity;
    const c = opts.backgroundColor;
    const vec4 = new Vector4(c.r, c.g, c.b, a);
    this.uniforms.backgroundColor.value.copy(vec4);
    const colorimetry = opts.colorimetry;
    this.uniforms.brightnessContrastSaturation.value.set(colorimetry.brightness, colorimetry.contrast, colorimetry.saturation);
  }
  updateHillshadingUniforms(opts) {
    const params = opts.lighting;
    MaterialUtils.setDefine(this, 'APPLY_SHADING_ON_COLORLAYERS', !params.elevationLayersOnly);
    const uniform = this.uniforms.hillshading.value;
    if (params.mode === MapLightingMode.Hillshade) {
      uniform.zenith = params.hillshadeZenith ?? DEFAULT_ZENITH;
      uniform.azimuth = params.hillshadeAzimuth ?? DEFAULT_AZIMUTH;
      uniform.intensity = params.hillshadeIntensity ?? 1;
    }
    uniform.mode = mapLightingMode(params);
    uniform.zFactor = params.zFactor ?? 1;
  }
  update(opts) {
    if (opts) {
      this._options = opts;
      this.depthTest = opts.depthTest;
      if (this._colorMapAtlas) {
        this.updateColorMaps();
      }
      this.updateColorUniforms(opts);
      this.updateGraticuleUniforms(opts);
      this.updateContourLineUniforms(opts);
      this.updateHillshadingUniforms(opts);
      if (opts.elevationRange) {
        const {
          min,
          max
        } = opts.elevationRange;
        this.uniforms.elevationRange.value.set(min, max);
      }
      MaterialUtils.setDefine(this, 'ELEVATION_LAYER', this._elevationLayer?.visible);
      MaterialUtils.setDefine(this, 'ENABLE_OUTLINES', opts.showTileOutlines);
      if (opts.showTileOutlines) {
        this.uniforms.tileOutlineColor.value = getColor(opts.tileOutlineColor);
      }
      MaterialUtils.setDefine(this, 'DISCARD_NODATA_ELEVATION', opts.discardNoData);
      MaterialUtils.setDefine(this, 'TERRAIN_DEFORMATION', opts.terrain.enabled);
      MaterialUtils.setDefine(this, 'STITCHING', opts.terrain.stitching);
      const newSide = opts.side;
      if (this.side !== newSide) {
        this.side = newSide;
        this.needsUpdate = true;
      }
    }
    if (this._colorLayers.length === 0) {
      return true;
    }
    return this.rebuildAtlasIfNecessary();
  }
  updateColorLayerCount() {
    // If we have fewer textures than allowed by WebGL max texture units,
    // then we can directly use those textures in the shader.
    // Otherwise we have to reduce the number of color textures by aggregating
    // them in a texture atlas. Note that doing so will have a performance cost,
    // both increasing memory consumption and GPU time, since each color texture
    // must rendered into the atlas.
    const {
      totalTextureUnits,
      visibleColorLayers
    } = this.countIndividualTextures();
    const shouldUseAtlas = this._forceTextureAtlas || totalTextureUnits > this._maxTextureImageUnits;
    MaterialUtils.setDefine(this, 'USE_ATLAS_TEXTURE', shouldUseAtlas);

    // If the number of visible layers has changed, we need to repaint the
    // atlas because it only shows visible layers.
    if (MaterialUtils.setDefineValue(this, 'VISIBLE_COLOR_LAYER_COUNT', visibleColorLayers)) {
      this._mustUpdateUniforms = true;
      this._needsAtlasRepaint = true;
      this.needsUpdate = true;
    }
  }
  customProgramCacheKey() {
    return (this.defines.VISIBLE_COLOR_LAYER_COUNT ?? 0).toString();
  }
  createComposer() {
    const newComposer = new WebGLComposer({
      extent: new Rect(0, this._atlasInfo.maxX, 0, this._atlasInfo.maxY),
      width: this._atlasInfo.maxX,
      height: this._atlasInfo.maxY,
      reuseTexture: true,
      webGLRenderer: this._renderer,
      pixelFormat: RGBAFormat,
      textureDataType: this._composerDataType
    });
    return newComposer;
  }
  get composerWidth() {
    return this._composer?.width ?? 0;
  }
  get composerHeight() {
    return this._composer?.height ?? 0;
  }
  rebuildAtlasIfNecessary() {
    if (this._composer == null || this._atlasInfo.maxX > this.composerWidth || this._atlasInfo.maxY > this.composerHeight || this._composer.dataType !== this._composerDataType) {
      const newComposer = this.createComposer();
      let newTexture = null;
      const currentTexture = this._texturesInfo.color.atlasTexture;
      if (this._composer && currentTexture && this.composerWidth > 0) {
        // repaint the old canvas into the new one.
        newComposer.draw(currentTexture, new Rect(0, this.composerWidth, 0, this.composerHeight));
        newTexture = newComposer.render();
      }
      this._composer?.dispose();
      currentTexture?.dispose();
      this._composer = newComposer;
      const atlases = nonNull(this._atlasInfo.atlas);
      for (let i = 0; i < this._colorLayers.length; i++) {
        const layer = this._colorLayers[i];
        const atlas = atlases[layer.id];
        const pitch = this._texturesInfo.color.infos[i].originalOffsetScale;
        const texture = this._texturesInfo.color.infos[i].texture;

        // compute offset / scale
        const w = texture?.image?.width ?? EMPTY_IMAGE_SIZE;
        const h = texture?.image?.height ?? EMPTY_IMAGE_SIZE;
        const xRatio = w / this.composerWidth;
        const yRatio = h / this.composerHeight;
        this._texturesInfo.color.infos[i].offsetScale = new OffsetScale(atlas.x / this.composerWidth + pitch.x * xRatio, (atlas.y + nonNull(atlas.offset)) / this.composerHeight + pitch.y * yRatio, pitch.z * xRatio, pitch.w * yRatio);
      }
      this.rebuildAtlasTexture(newTexture);
    }
    return this.composerWidth > 0;
  }
  rebuildAtlasTexture(newTexture) {
    if (newTexture) {
      newTexture.name = 'LayeredMaterial - Atlas';
    }
    this._texturesInfo.color.atlasTexture?.dispose();
    this._texturesInfo.color.atlasTexture = newTexture;
    this.uniforms.atlasTexture.value = this._texturesInfo.color.atlasTexture;
  }
  changeState(state) {
    if (this.uniforms.renderingState.value === state) {
      return;
    }
    this.uniforms.renderingState.value = state;
    this.updateOpacityParameters(this.opacity);
    this.updateBlendingMode();
    this.needsUpdate = true;
  }
  updateBlendingMode() {
    const state = this.uniforms.renderingState.value;
    if (state === RenderingState.FINAL) {
      const background = this._options?.backgroundOpacity ?? 1;
      this.transparent = this.opacity < 1 || background < 1;
      this.needsUpdate = true;
      this.blending = NormalBlending;
    } else {
      // We cannot use alpha blending with custom rendering states because the alpha component
      // of the fragment in those modes has nothing to do with transparency at all.
      this.blending = NoBlending;
      this.transparent = false;
      this.needsUpdate = true;
    }
  }
  hasColorLayer(layer) {
    return this.indexOfColorLayer(layer) !== -1;
  }
  hasElevationLayer(layer) {
    return this._elevationLayer !== layer;
  }
  indexOfColorLayer(layer) {
    return this._colorLayers.indexOf(layer);
  }
  updateOpacityParameters(opacity) {
    this.uniforms.opacity.value = opacity;
    this.updateBlendingMode();
  }
  setLayerOpacity(layer, opacity) {
    const index = this.indexOfColorLayer(layer);
    this._texturesInfo.color.infos[index].opacity = opacity;
    this._mustUpdateUniforms = true;
  }
  setLayerVisibility(layer, visible) {
    const index = this.indexOfColorLayer(layer);
    this._texturesInfo.color.infos[index].visible = visible;
    this._mustUpdateUniforms = true;
    this.needsUpdate = true;
    this.reorderLayers();
    this.updateColorLayerCount();
  }
  setLayerElevationRange(layer, range) {
    if (range != null) {
      MaterialUtils.setDefine(this, 'ENABLE_ELEVATION_RANGE', true);
    }
    const index = this.indexOfColorLayer(layer);
    const value = range ? new Vector2(range.min, range.max) : DISABLED_ELEVATION_RANGE;
    this._texturesInfo.color.infos[index].elevationRange = value;
    this._mustUpdateUniforms = true;
  }
  setColorimetry(layer, brightness, contrast, saturation) {
    const index = this.indexOfColorLayer(layer);
    this._texturesInfo.color.infos[index].brightnessContrastSaturation.set(brightness, contrast, saturation);
    this._mustUpdateUniforms = true;
  }
  getElevationTexture() {
    return this._texturesInfo.elevation.texture;
  }
  getElevationOffsetScale() {
    return this._texturesInfo.elevation.offsetScale;
  }

  /** @internal */
  getElevationLayer() {
    return this._elevationLayer;
  }

  /**
   * Gets the number of layers on this material.
   *
   * @returns The number of layers present on this material.
   */
  getLayerCount() {
    return (this._elevationLayer ? 1 : 0) + this._colorLayers.length;
  }
  setUuid(uuid) {
    this.uniforms.uuid.value = uuid;
  }
}
export default LayeredMaterial;