/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */

import { Color, GLSL3, Matrix4, NoBlending, NormalBlending, ShaderMaterial, Uniform, Vector2, Vector3, Vector4 } from 'three';
import OffsetScale from '../core/OffsetScale';
import MaterialUtils from './MaterialUtils';
import { ASPRS_CLASSIFICATIONS, Classification } from './pointcloudmaterial/Classification';
import { buildColorMapUniform, createDefaultColorMap } from './pointcloudmaterial/ColorMapUniform';
import { ClassificationSlot } from './pointcloudmaterial/slots/ClassificationSlot';
import { ColorSlot } from './pointcloudmaterial/slots/ColorSlot';
import { ScalarSlot } from './pointcloudmaterial/slots/ScalarSlot';
/* babel-plugin-inline-import './shader/PointsFS.glsl' */
const PointsFS = "#include <giro3d_precision_qualifiers>\n#include <giro3d_fragment_shader_header>\n#include <giro3d_common>\n\n#include <common>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\n#include <fog_pars_fragment>\n\nvarying vec4 vColor;\nuniform vec3 brightnessContrastSaturation;\n\nconst float HALF_LENGTH = 0.5;\nconst vec2 POINT_CENTER = vec2(HALF_LENGTH, HALF_LENGTH);\nconst float HALF_LENGTH_SQUARED = HALF_LENGTH * HALF_LENGTH;\n\nfloat sqLength(in vec2 v) {\n    return v.x * v.x + v.y * v.y;\n}\n\nvoid main() {\n    if (vColor.a < 0.001) {\n        discard;\n        return;\n    }\n\n    // circular point rendering\n    if (sqLength(gl_PointCoord - POINT_CENTER) > HALF_LENGTH_SQUARED){\n        discard;\n        return;\n    }\n\n    #include <clipping_planes_fragment>\n\n    gl_FragColor = vec4(adjustBrightnessContrastSaturation(vColor.rgb, brightnessContrastSaturation), vColor.a);\n\n    #include <colorspace_fragment>\n    #include <fog_fragment>\n    #include <logdepthbuf_fragment>\n}\n";
/* babel-plugin-inline-import './shader/PointsVS.glsl' */
const PointsVS = "#include <giro3d_precision_qualifiers>\n#include <giro3d_common>\n#include <giro3d_intersecting_volume_pars>\n\n#include <common>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\n#include <fog_pars_vertex>\n\n#define EPSILON 1e-6\n\nuniform float size;\n\nuniform uint pickingId;\nuniform int mode;\nuniform float opacity;\nuniform vec4 overlayColor;\n\nstruct PointCloudColorMap {\n    float min;\n    float max;\n    sampler2D lut;\n};\n\nuniform PointCloudColorMap elevationColorMap;\n\nstruct ColorProperties {\n    float weight;\n};\nuniform ColorProperties colorProperties[3];\nattribute vec3 color;\n#if defined(COLOR_1)\nattribute vec3 color_1;\n#endif\n#if defined(COLOR_2)\nattribute vec3 color_2;\n#endif\n\nstruct ScalarProperties {\n    float weight;\n    PointCloudColorMap colorMap;\n};\nuniform ScalarProperties scalarProperties[3];\n#if defined(SCALAR_0)\nattribute SCALAR_0_TYPE scalar;\n#endif\n#if defined(SCALAR_1)\nattribute SCALAR_1_TYPE scalar_1;\n#endif\n#if defined(SCALAR_2)\nattribute SCALAR_2_TYPE scalar_2;\n#endif\n\nstruct ClassificationProperties {\n    float weight;\n    sampler2D lut;\n};\nuniform ClassificationProperties classificationProperties[3];\n#if defined(CLASSIFICATION_0)\nattribute uint classification;\n#endif\n#if defined(CLASSIFICATION_1)\nattribute uint classification_1;\n#endif\n#if defined(CLASSIFICATION_2)\nattribute uint classification_2;\n#endif\n\n#if defined(NORMAL_OCT16)\nattribute vec2 oct16Normal;\n#elif defined(NORMAL_SPHEREMAPPED)\nattribute vec2 sphereMappedNormal;\n#endif\n\nuniform sampler2D overlayTexture;\nuniform int decimation;\nuniform float hasOverlayTexture;\nuniform vec4 offsetScale;\nuniform vec2 extentBottomLeft;\nuniform vec2 extentSize;\n\nvarying vec4 vColor;\n\n// see https://web.archive.org/web/20150303053317/http://lgdv.cs.fau.de/get/1602\n// and implementation in PotreeConverter (BINPointReader.cpp) and potree (BinaryDecoderWorker.js)\n#if defined(NORMAL_OCT16)\nvec3 decodeOct16Normal(vec2 encodedNormal) {\n    vec2 nNorm = 2. * (encodedNormal / 255.) - 1.;\n    vec3 n;\n    n.z = 1. - abs(nNorm.x) - abs(nNorm.y);\n    if (n.z >= 0.) {\n        n.x = nNorm.x;\n        n.y = nNorm.y;\n    } else {\n        n.x = sign(nNorm.x) - sign(nNorm.x) * sign(nNorm.y) * nNorm.y;\n        n.y = sign(nNorm.y) - sign(nNorm.y) * sign(nNorm.x) * nNorm.x;\n    }\n    return normalize(n);\n}\n#elif defined(NORMAL_SPHEREMAPPED)\n// see http://aras-p.info/texts/CompactNormalStorage.html method #4\n// or see potree's implementation in BINPointReader.cpp\nvec3 decodeSphereMappedNormal(vec2 encodedNormal) {\n    vec2 fenc = 2. * encodedNormal / 255. - 1.;\n    float f = dot(fenc,fenc);\n    float g = 2. * sqrt(1. - f);\n    vec3 n;\n    n.xy = fenc * g;\n    n.z = 1. - 2. * f;\n    return n;\n}\n#endif\n\n#ifdef DEFORMATION_SUPPORT\nuniform int enableDeformations;\nstruct Deformation {\n    mat4 transformation;\n    vec3 vec;\n    vec2 origin;\n    vec2 influence;\n    vec4 colors;\n};\n\nuniform Deformation deformations[NUM_TRANSFO];\n#endif\n\nvoid discardPoint() {\n    // Move the vertex out of the render area to prevent calling the fragment shader for\n    // this point, saving a lot of GPU processing time when millions of points are displayed.\n    gl_PointSize = 0.0;\n    gl_Position = vec4(-9999.0, -9999.0, -9999.0, 0.0);\n}\n\nvec4 computeColorFromScalar(const float value, const PointCloudColorMap colorMap) {\n    return sampleColorMap(value, colorMap.min, colorMap.max, colorMap.lut, 0.0);\n}\n\nvoid addScalarContribution(const float value, const ScalarProperties properties, inout vec4 color) {\n    if (properties.weight > 0.0) {\n        color += computeColorFromScalar(value, properties.colorMap) * properties.weight;\n    }\n}\n\nvoid addClassificationContribution(const uint classification, const ClassificationProperties properties, inout vec4 color) {\n    if (properties.weight > 0.0) {\n        color += texelFetch(properties.lut, ivec2(classification, 0), 0) * properties.weight;\n    }\n}\n\nvoid addColorContribution(const vec3 value, const ColorProperties properties, inout vec4 color) {\n    if (properties.weight > 0.0) {\n        // We need to convert to linear color space because the colors are in sRGB and they\n        // are not automatically converted to sRGB-linear. This is due to the fact that those\n        // colors come from a vertex buffer and not from a texture (automatically converted)\n        // or a single color uniform (also automatically converted).\n        vec4 linear = sRGBToLinear(vec4(value, 1.0));\n        color += vec4(mix(linear.rgb, overlayColor.rgb, overlayColor.a), 1) * properties.weight;\n    }\n}\n\nvoid main() {\n    if (decimation > 1 && gl_VertexID % decimation != 0) {\n        discardPoint();\n        return;\n    }\n\n#if defined(NORMAL_OCT16)\n    vec3  normal = decodeOct16Normal(oct16Normal);\n#elif defined(NORMAL_SPHEREMAPPED)\n    vec3 normal = decodeSphereMappedNormal(sphereMappedNormal);\n#elif defined(NORMAL)\n    // nothing to do\n#else\n    // default to color\n    vec3 normal = color;\n#endif\n\n    if (mode == MODE_NORMAL) {\n        vColor = vec4(abs(normal), 1);\n    } else if (mode == MODE_TEXTURE) {\n        vec2 pp = (modelMatrix * vec4(position, 1.0)).xy;\n        // offsetScale is from bottomleft\n        pp.x -= extentBottomLeft.x;\n        pp.y -= extentBottomLeft.y;\n        pp *= offsetScale.zw / extentSize;\n        pp += offsetScale.xy;\n        vec3 textureColor = texture2D(overlayTexture, pp).rgb;\n        vColor = vec4(mix(textureColor, overlayColor.rgb, overlayColor.a), hasOverlayTexture);\n    } else if (mode == MODE_ELEVATION) {\n        float z = (modelMatrix * vec4(position, 1.0)).z;\n        vColor = computeColorFromScalar(z, elevationColorMap);\n    } else {\n        vColor = vec4(0);\n        \n        #if defined(SCALAR_0)\n        addScalarContribution(float(scalar), scalarProperties[0], vColor);\n        #endif\n        #if defined(SCALAR_1)\n        addScalarContribution(float(scalar_1), scalarProperties[1], vColor);\n        #endif\n        #if defined(SCALAR_2)\n        addScalarContribution(float(scalar_2), scalarProperties[2], vColor);\n        #endif\n\n        #if defined(CLASSIFICATION_0)\n        addClassificationContribution(classification, classificationProperties[0], vColor);\n        #endif\n        #if defined(CLASSIFICATION_1)\n        addClassificationContribution(classification_1, classificationProperties[1], vColor);\n        #endif\n        #if defined(CLASSIFICATION_2)\n        addClassificationContribution(classification_2, classificationProperties[2], vColor);\n        #endif\n\n        addColorContribution(color, colorProperties[0], vColor);\n        #if defined(COLOR_1)\n        addColorContribution(color_1, colorProperties[1], vColor);\n        #endif\n        #if defined(COLOR_2)\n        addColorContribution(color_2, colorProperties[2], vColor);\n        #endif\n    }\n\n    vColor.a *= opacity;\n    \n    if (pickingId > 0u) {\n        if (vColor.a <= EPSILON) {\n            discardPoint();\n            return;\n        }\n\n        // In picking mode, we simply output the point id in the red channel and the object id in the green channel.\n        // No need to encode them because we are rendering to a float texture.\n        vColor = vec4(float(gl_VertexID), float(pickingId), 0, 1);\n    }\n\n    mat4 mvMatrix = modelViewMatrix;\n\n    #ifdef DEFORMATION_SUPPORT\n    if (!pickingMode) {\n        vColor = enableDeformations > 0 ?\n            vec4(0.0, 1.0, 1.0, 1.0):\n            vec4(1.0, 0.0, 1.0, 1.0);\n    }\n    if (enableDeformations > 0) {\n        vec4 mPosition = modelMatrix * vec4(position, 1.0);\n        float minDistance = 1000.0;\n        int bestChoice = -1;\n        for (int i = 0; i < NUM_TRANSFO; i++) {\n            if (i >= enableDeformations) {\n                break;\n            }\n            vec2 v = deformations[i].vec.xy;\n            float length = deformations[i].vec.z;\n            float depassement_x =\n                length * (deformations[i].influence.x - 1.0);\n\n            vec2 diff = mPosition.xy - origin[i];\n            float distance_x = dot(diff, v);\n\n            if (-depassement_x <= distance_x &&\n                    distance_x <= (length + depassement_x)) {\n                vec2 normal = vec2(-v.y, v.x);\n                float d = abs(dot(diff, normal));\n                if (d < minDistance && d <= deformations[i].influence.y) {\n                    minDistance = d;\n                    bestChoice = i;\n                }\n            }\n        }\n\n        if (bestChoice >= 0) {\n            // override modelViewMatrix\n            mvMatrix = deformations[bestChoice].transformation;\n            vColor = mix(\n                deformations[bestChoice].color,\n                vec4(color, 1.0),\n                0.5);\n        }\n    }\n    #endif\n\n    #include <begin_vertex>\n    #include <project_vertex>\n\n    if (size > 0.) {\n        gl_PointSize = size;\n    } else {\n        gl_PointSize = clamp(-size / gl_Position.w, 3.0, 10.0);\n    }\n\n    #ifdef INTERSECTING_VOLUMES_SUPPORT\n    // don't break picking mode\n    if (pickingId == 0u) {\n        vec4 viewPosition = mvMatrix * vec4(position, 1);\n        viewPosition.xyz / viewPosition.w;\n        applyIntersectingVolumes(viewPosition, vColor);\n    }\n    #endif\n\n    #include <fog_vertex>\n    #include <logdepthbuf_vertex>\n    #include <clipping_planes_vertex>\n}\n";
export { ASPRS_CLASSIFICATIONS, Classification };
const tmpDims = new Vector2();

/**
 * Specifies the way points are colored.
 */
export let MODE = /*#__PURE__*/function (MODE) {
  /** The points are colored using their own color */
  MODE[MODE["COLOR"] = 0] = "COLOR";
  /** The points are colored using  one of their attributes */
  MODE[MODE["SCALAR"] = 1] = "SCALAR";
  /** The points are colored using their classification */
  MODE[MODE["CLASSIFICATION"] = 2] = "CLASSIFICATION";
  /** The points are colored using their normal */
  MODE[MODE["NORMAL"] = 3] = "NORMAL";
  /** The points are colored using an external texture, such as a color layer */
  MODE[MODE["TEXTURE"] = 4] = "TEXTURE";
  /** The points are colored using their elevation */
  MODE[MODE["ELEVATION"] = 5] = "ELEVATION";
  /** The points are colored using a mix of their attributes */
  MODE[MODE["ATTRIBUTES"] = 6] = "ATTRIBUTES";
  return MODE;
}({});
const NUM_TRANSFO = 16;
/**
 * Material used for point clouds.
 */
class PointCloudMaterial extends ShaderMaterial {
  // This is an arbitrary limit, only there to prevent running out of uniform slots.
  static maxIntersectingVolumesCount = 8;
  isPointCloudMaterial = true;
  disposed = false;
  intersectingVolumes = [];
  _elevationColorMap = createDefaultColorMap();

  /**
   * @internal
   */

  /**
   * @internal
   */

  /**
   * Gets or sets the point size.
   */
  get size() {
    return this.uniforms.size.value;
  }
  set size(value) {
    this.uniforms.size.value = value;
  }

  /**
   * Gets or sets the point decimation value.
   * A decimation value of N means that we take every Nth point and discard the rest.
   */
  get decimation() {
    return this.uniforms.decimation.value;
  }
  set decimation(value) {
    this.uniforms.decimation.value = value;
  }

  /**
   * Gets or sets the display mode (color, classification...)
   */
  get mode() {
    return this.uniforms.mode.value;
  }
  set mode(mode) {
    if (mode === MODE.COLOR || mode === MODE.CLASSIFICATION || mode === MODE.SCALAR) {
      this.attributesState = {
        colors: [{
          weight: mode === MODE.COLOR ? 1 : 0
        }, {
          weight: 0
        }, {
          weight: 0
        }],
        scalars: [{
          weight: mode === MODE.SCALAR ? 1 : 0
        }, {
          weight: 0
        }, {
          weight: 0
        }],
        classifications: [{
          weight: mode === MODE.CLASSIFICATION ? 1 : 0
        }, {
          weight: 0
        }, {
          weight: 0
        }]
      };
    }
    this.uniforms.mode.value = mode;
  }

  /**
   * Update material uniforms related to scalar and classification attributes.
   */
  setupFromGeometry(geometry) {
    for (const slot of this._classificationSlots) {
      slot.hasAttribute = geometry.hasAttribute(slot.attributeName);
    }
    for (const slot of this._scalarSlots) {
      slot.hasAttribute = geometry.hasAttribute(slot.attributeName);
      if (slot.hasAttribute) {
        slot.attributeType = MaterialUtils.getVertexAttributeType(geometry.getAttribute(slot.attributeName));
      }
    }
    for (let i = 1; i < this._colorSlots.length; i++) {
      const slot = this._colorSlots[i];
      slot.hasAttribute = geometry.hasAttribute(slot.attributeName);
    }
  }

  /**
   * @internal
   */
  get pickingId() {
    return this.uniforms.pickingId.value;
  }

  /**
   * @internal
   */
  set pickingId(id) {
    this.uniforms.pickingId.value = id;
  }

  /**
   * Gets or sets the overlay color (default color).
   */
  get overlayColor() {
    return this.uniforms.overlayColor.value;
  }
  set overlayColor(color) {
    this.uniforms.overlayColor.value = color;
  }

  /**
   * Gets or sets the brightness of the points.
   */
  get brightness() {
    return this.uniforms.brightnessContrastSaturation.value.x;
  }
  set brightness(v) {
    this.uniforms.brightnessContrastSaturation.value.setX(v);
  }

  /**
   * Gets or sets the contrast of the points.
   */
  get contrast() {
    return this.uniforms.brightnessContrastSaturation.value.y;
  }
  set contrast(v) {
    this.uniforms.brightnessContrastSaturation.value.setY(v);
  }

  /**
   * Gets or sets the saturation of the points.
   */
  get saturation() {
    return this.uniforms.brightnessContrastSaturation.value.z;
  }
  set saturation(v) {
    this.uniforms.brightnessContrastSaturation.value.setZ(v);
  }
  get elevationColorMap() {
    return this._elevationColorMap;
  }
  set elevationColorMap(colorMap) {
    this._elevationColorMap = colorMap;
  }

  /**
   * Creates a PointsMaterial using the specified options.
   *
   * @param options - The options.
   */
  constructor(options = {}) {
    super({
      clipping: true,
      glslVersion: GLSL3
    });
    this.vertexShader = PointsVS;
    this.fragmentShader = PointsFS;

    // Default
    this.defines = {
      SCALAR_0_TYPE: 'uint',
      SCALAR_1_TYPE: 'uint',
      SCALAR_2_TYPE: 'uint',
      MAX_INTERSECTING_VOLUMES_COUNT: PointCloudMaterial.maxIntersectingVolumesCount
    };
    for (const key of Object.keys(MODE)) {
      if (Object.prototype.hasOwnProperty.call(MODE, key)) {
        // @ts-expect-error a weird pattern indeed
        this.defines[`MODE_${key}`] = MODE[key];
      }
    }
    this.fog = true;
    this.colorLayer = null;
    this.needsUpdate = true;
    this._colorSlots = [new ColorSlot(this, 0), new ColorSlot(this, 1), new ColorSlot(this, 2)];
    this._scalarSlots = [new ScalarSlot(this, 0), new ScalarSlot(this, 1), new ScalarSlot(this, 2)];
    this._classificationSlots = [new ClassificationSlot(this, 0), new ClassificationSlot(this, 1), new ClassificationSlot(this, 2)];
    this.uniforms = {
      fogDensity: new Uniform(0.00025),
      fogNear: new Uniform(1),
      fogFar: new Uniform(2000),
      decimation: new Uniform(1),
      fogColor: new Uniform(new Color(0xffffff)),
      colorProperties: new Uniform(this._colorSlots.map(slot => slot.uniform)),
      scalarProperties: new Uniform(this._scalarSlots.map(slot => slot.uniform)),
      classificationProperties: new Uniform(this._classificationSlots.map(slot => slot.uniform)),
      // Texture-related uniforms
      extentBottomLeft: new Uniform(new Vector2(0, 0)),
      extentSize: new Uniform(new Vector2(0, 0)),
      overlayTexture: new Uniform(null),
      hasOverlayTexture: new Uniform(0),
      offsetScale: new Uniform(new OffsetScale(0, 0, 1, 1)),
      elevationColorMap: new Uniform(buildColorMapUniform(this.elevationColorMap)),
      size: new Uniform(options.size ?? 0),
      mode: new Uniform(options.mode ?? MODE.COLOR),
      pickingId: new Uniform(0),
      opacity: new Uniform(this.opacity),
      overlayColor: new Uniform(options.overlayColor ?? new Vector4(0, 0, 0, 0)),
      brightnessContrastSaturation: new Uniform(new Vector3(0, 1, 1)),
      enableDeformations: new Uniform(false),
      deformations: new Uniform([]),
      intersectingVolumes: new Uniform({
        count: 0,
        volumes: []
      })
    };
    for (let i = 0; i < NUM_TRANSFO; i++) {
      this.uniforms.deformations.value.push({
        transformation: new Matrix4(),
        vec: new Vector3(),
        origin: new Vector2(),
        influence: new Vector2(),
        color: new Color()
      });
    }
    for (let i = 0; i < PointCloudMaterial.maxIntersectingVolumesCount; i++) {
      this.uniforms.intersectingVolumes.value.volumes.push({
        viewToBoxNc: new Matrix4(),
        color: new Color()
      });
    }
  }
  dispose() {
    if (this.disposed) {
      return;
    }
    for (const slot of this._classificationSlots) {
      slot.dispose();
    }
    this.dispatchEvent({
      type: 'dispose'
    });
    this.disposed = true;
  }

  /**
   * Internally used for picking.
   * @internal
   */
  enablePicking(picking) {
    this.pickingId = picking;
    this.blending = picking ? NoBlending : NormalBlending;
  }
  hasColorLayer(layer) {
    return this.colorLayer === layer;
  }
  updateUniforms() {
    this.uniforms.opacity.value = this.opacity;
    this.uniforms.elevationColorMap.value = buildColorMapUniform(this.elevationColorMap);
    for (const slot of this._scalarSlots) {
      slot.update();
    }
  }
  onBeforeRender(_renderer, _scene, camera) {
    this.uniforms.opacity.value = this.opacity;
    this.transparent = this.opacity < 1 || this.elevationColorMap.opacity != null;
    this.updateAttributesWeights();
    this.updateIntersectingVolumes(camera);
    for (const slot of this._classificationSlots) {
      slot.update();
    }
  }
  copy(source) {
    super.copy(source);
    this.needsUpdate = true;
    this.size = source.size;
    this.mode = source.mode;
    this.overlayColor.copy(source.overlayColor);
    this.attributesState = source.attributesState;
    this.brightness = source.brightness;
    this.contrast = source.contrast;
    this.saturation = source.saturation;
    this.elevationColorMap = source.elevationColorMap;
    this.decimation = source.decimation;
    this.updateUniforms();
    return this;
  }
  removeColorLayer() {
    this.mode = MODE.COLOR;
    this.colorLayer = null;
    this.uniforms.overlayTexture.value = null;
    this.needsUpdate = true;
    this.uniforms.hasOverlayTexture.value = 0;
  }
  pushColorLayer(layer, extent) {
    this.mode = MODE.TEXTURE;
    this.colorLayer = layer;
    this.uniforms.extentBottomLeft.value.set(extent.west, extent.south);
    const dim = extent.dimensions(tmpDims);
    this.uniforms.extentSize.value.copy(dim);
    this.needsUpdate = true;
  }
  indexOfColorLayer(layer) {
    if (layer === this.colorLayer) {
      return 0;
    }
    return -1;
  }
  getColorTexture(layer) {
    if (layer !== this.colorLayer) {
      return null;
    }
    return this.uniforms.overlayTexture?.value;
  }
  setColorTextures(layer, textureAndPitch) {
    const {
      texture
    } = textureAndPitch;
    this.uniforms.overlayTexture.value = texture;
    this.uniforms.hasOverlayTexture.value = 1;
  }
  setLayerVisibility() {
    // no-op
  }
  setLayerOpacity() {
    // no-op
  }
  setLayerElevationRange() {
    // no-op
  }
  setColorimetry() {
    // Not implemented because the points have their own BCS controls
  }
  get attributesState() {
    return {
      colors: [this._colorSlots[0].state, this._colorSlots[1].state, this._colorSlots[2].state],
      scalars: [this._scalarSlots[0].state, this._scalarSlots[1].state, this._scalarSlots[2].state],
      classifications: [this._classificationSlots[0].state, this._classificationSlots[1].state, this._classificationSlots[2].state]
    };
  }
  set attributesState(state) {
    if (typeof state.colors !== 'undefined') {
      const colors = state.colors;
      this._colorSlots.forEach((slot, index) => {
        if (typeof colors[index] !== 'undefined') {
          slot.state = colors[index];
        }
      });
    }
    if (typeof state.scalars !== 'undefined') {
      const scalars = state.scalars;
      this._scalarSlots.forEach((slot, index) => {
        if (typeof scalars[index] !== 'undefined') {
          slot.state = scalars[index];
        }
      });
    }
    if (typeof state.classifications !== 'undefined') {
      const classifications = state.classifications;
      this._classificationSlots.forEach((slot, index) => {
        if (typeof classifications[index] !== 'undefined') {
          slot.state = classifications[index];
        }
      });
    }
  }

  /**
   * Unused for now.
   * @internal
   */
  enableTransfo(v) {
    if (v) {
      this.defines.DEFORMATION_SUPPORT = 1;
      this.defines.NUM_TRANSFO = NUM_TRANSFO;
    } else {
      delete this.defines.DEFORMATION_SUPPORT;
      delete this.defines.NUM_TRANSFO;
    }
    this.needsUpdate = true;
  }
  updateIntersectingVolumes(camera) {
    const hasIntersectingVolumes = this.intersectingVolumes.length > 0;
    MaterialUtils.setDefine(this, 'INTERSECTING_VOLUMES_SUPPORT', hasIntersectingVolumes);
    if (hasIntersectingVolumes) {
      if (this.intersectingVolumes.length > PointCloudMaterial.maxIntersectingVolumesCount) {
        throw new Error(`Too many intersecting volumes (${this.intersectingVolumes.length}, max is ${PointCloudMaterial.maxIntersectingVolumesCount}).`);
      }
      const invViewMatrix = camera.matrixWorld;
      for (let i = 0; i < this.intersectingVolumes.length; i++) {
        const volumeUniform = this.uniforms.intersectingVolumes.value.volumes[i];
        const volumeDefinition = this.intersectingVolumes[i];
        volumeUniform.viewToBoxNc.multiplyMatrices(volumeDefinition.worldToBoxNdc, invViewMatrix);
        volumeUniform.color.copy(volumeDefinition.color);
      }
      this.uniforms.intersectingVolumes.value.count = this.intersectingVolumes.length;
    }
  }
  updateAttributesWeights() {
    const allSlots = [...this._scalarSlots, ...this._classificationSlots, ...this._colorSlots];
    let totalWeight = 0;
    for (const slot of allSlots) {
      totalWeight += slot.actualWeight;
    }
    if (totalWeight > 0) {
      // normalize attributes
      for (const slot of allSlots) {
        slot.actualWeight /= totalWeight;
      }
    } else {
      // default to color
      this._colorSlots[0].weight = 1;
    }
  }
  static isPointCloudMaterial = obj => obj?.isPointCloudMaterial;
}
export default PointCloudMaterial;