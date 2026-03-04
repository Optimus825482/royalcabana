/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */

import { CanvasTexture, FloatType, GLSL3, ShaderMaterial, Uniform } from 'three';
import Interpretation, { Mode } from '../../core/layer/Interpretation';
import TextureGenerator from '../../utils/TextureGenerator';
/* babel-plugin-inline-import './ComposerTileFS.glsl' */
const FragmentShader = "#include <giro3d_precision_qualifiers>\n#include <giro3d_fragment_shader_header>\n#include <giro3d_common>\n\nvarying vec2 vUv;\n\nuniform Interpretation interpretation;\nuniform sampler2D tex;\nuniform sampler2D gridTexture;\nuniform float opacity;\nuniform bool flipY;\nuniform NoDataOptions noDataOptions;\nuniform bool showImageOutlines;\nuniform bool isEmptyTexture;\nuniform bool showEmptyTexture;\nuniform bool convertRGFloatToRGBAUnsignedByte;\nuniform int channelCount;\nuniform bool expandRGB;\nuniform float heightPrecision;\nuniform float heightOffset;\n\nvoid main() {\n    vec2 uv = flipY\n        ? vec2(vUv.x, 1.0 - vUv.y)\n        : vUv;\n\n    gl_FragColor = vec4(0, 0, 0, 0);\n\n    if (!isEmptyTexture) {\n        int alphaChannelLocation = channelCount - 1;\n\n        if (noDataOptions.enabled) {\n            gl_FragColor = texture2DFillNodata(tex, uv, noDataOptions, alphaChannelLocation);\n        } else {\n            vec4 color = texture2D(tex, uv);\n            gl_FragColor = color;\n\n            if (convertRGFloatToRGBAUnsignedByte) {\n                gl_FragColor = convert_RG_Float_RGBA_UnsignedByte(gl_FragColor, heightPrecision, heightOffset);\n            } else {\n                gl_FragColor = decodeInterpretation(gl_FragColor, interpretation);\n            }\n\n            if(expandRGB) {\n                gl_FragColor = grayscaleToRGB(gl_FragColor, interpretation);\n            }\n\n            // Transfer alpha channel to its new location\n            gl_FragColor.a = color[alphaChannelLocation];\n        }\n    } else if (showEmptyTexture) {\n        gl_FragColor = vec4(1, 0, 0, 0.5);\n    }\n\n    if (showImageOutlines && (!isEmptyTexture || showEmptyTexture)) {\n        vec4 grid = texture2D(gridTexture, uv);\n        gl_FragColor = blend(grid, gl_FragColor);\n    }\n\n    gl_FragColor.a *= opacity;\n\n    #include <colorspace_fragment>\n}\n";
/* babel-plugin-inline-import './ComposerTileVS.glsl' */
const VertexShader = "#include <giro3d_precision_qualifiers>\n\n// outputs\nvarying vec2 vUv;\n\nvoid main() {\n    vUv = uv;\n    #include <begin_vertex>\n    #include <project_vertex>\n}"; // Matches the NoDataOptions struct in the shader
function createGridTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d', {
    willReadFrequently: true
  });
  if (!ctx) {
    throw new Error('could not acquire 2D rendering context');
  }
  const back = 'black';
  const fore = 'yellow';
  const borderWidth = 4;
  const lineWidth = 3;
  ctx.strokeStyle = back;
  ctx.lineWidth = lineWidth + 2 * borderWidth;
  ctx.strokeRect(0, 0, w, h);
  ctx.strokeStyle = fore;
  ctx.lineWidth = lineWidth;
  ctx.strokeRect(0, 0, w, h);
  ctx.strokeStyle = fore;
  ctx.setLineDash([8, 8]);
  ctx.lineWidth = 2;
  const subdivs = 2;
  for (let i = 1; i < subdivs; i++) {
    const x = i * (w / subdivs);
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let i = 1; i < subdivs; i++) {
    const y = i * (h / subdivs);
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Center of the image

  const radius = 4;
  const centerX = w / 2;
  const centerY = h / 2;
  ctx.fillStyle = back;
  ctx.beginPath();
  ctx.ellipse(centerX, centerY, radius + borderWidth, radius + borderWidth, 0, 0, 2 * Math.PI);
  ctx.fill();
  ctx.fillStyle = fore;
  ctx.beginPath();
  ctx.ellipse(centerX, centerY, radius, radius, 0, 0, 2 * Math.PI);
  ctx.fill();
  return new CanvasTexture(canvas);
}
const POOL = [];
const POOL_SIZE = 2048;
let GRID_TEXTURE;
class ComposerTileMaterial extends ShaderMaterial {
  isComposerTileMaterial = true;
  get type() {
    return 'ComposerTileMaterial';
  }
  /**
   * Creates an instance of ComposerTileMaterial.
   *
   * @param options - The options
   */
  constructor(options) {
    super({
      glslVersion: GLSL3
    });
    this.fragmentShader = FragmentShader;
    this.vertexShader = VertexShader;
    this.depthTest = false;
    this.uniforms = {
      tex: new Uniform(null),
      gridTexture: new Uniform(null),
      interpretation: new Uniform({
        max: 1,
        min: 0,
        mode: 0,
        negateValues: false
      }),
      flipY: new Uniform(false),
      noDataOptions: new Uniform({
        enabled: false,
        radius: 0,
        replacementAlpha: 0
      }),
      showImageOutlines: new Uniform(false),
      opacity: new Uniform(this.opacity),
      channelCount: new Uniform(3),
      expandRGB: new Uniform(options.expandRGB ?? false),
      showEmptyTexture: new Uniform(options.showEmptyTexture ?? false),
      isEmptyTexture: new Uniform(false),
      convertRGFloatToRGBAUnsignedByte: new Uniform(options.convertRGFloatToRGBAUnsignedByte != null),
      heightPrecision: new Uniform(options.convertRGFloatToRGBAUnsignedByte?.precision ?? 0.1),
      heightOffset: new Uniform(options.convertRGFloatToRGBAUnsignedByte?.offset ?? 20000)
    };
    if (options != null) {
      this.init(options);
    }
  }
  init(options) {
    const interp = options.interpretation ?? Interpretation.Raw;
    this.dataType = interp.mode !== Mode.Raw ? FloatType : options.texture.type;
    this.pixelFormat = options.texture.format;
    const interpValue = {};
    interp.setUniform(interpValue);

    // The no-data filling algorithm does not like transparent images
    this.needsUpdate = this.transparent !== options.transparent;
    this.transparent = options.transparent ?? false;
    this.opacity = 1;
    this.uniforms.opacity.value = this.opacity;
    this.uniforms.interpretation.value = interpValue;
    this.uniforms.tex.value = options.texture;
    this.uniforms.flipY.value = options.flipY ?? false;
    this.uniforms.noDataOptions.value = options.noDataOptions ?? {
      enabled: false,
      radius: 0,
      replacementAlpha: 0
    };
    this.uniforms.showImageOutlines.value = options.showImageOutlines ?? false;
    this.uniforms.expandRGB.value = options.expandRGB ?? false;
    this.uniforms.showEmptyTexture.value = options.showEmptyTexture ?? false;
    this.uniforms.isEmptyTexture.value = TextureGenerator.isEmptyTexture(options.texture);
    this.uniforms.convertRGFloatToRGBAUnsignedByte.value = options.convertRGFloatToRGBAUnsignedByte != null;
    this.uniforms.heightPrecision.value = options.convertRGFloatToRGBAUnsignedByte?.precision ?? 0.1;
    this.uniforms.heightOffset.value = options.convertRGFloatToRGBAUnsignedByte?.offset ?? 0.1;
    const channelCount = TextureGenerator.getChannelCount(this.pixelFormat);
    this.uniforms.channelCount.value = channelCount;
    if (options.showImageOutlines) {
      if (GRID_TEXTURE == null) {
        GRID_TEXTURE = createGridTexture();
      }
      this.uniforms.gridTexture.value = GRID_TEXTURE;
    }
  }
  reset() {
    this.uniforms.tex.value = null;
  }

  /**
   * Acquires a pooled material.
   *
   * @param opts - The options.
   */
  static acquire(opts) {
    if (POOL.length > 0) {
      const mat = POOL.pop();
      mat.init(opts);
      return mat;
    }
    return new ComposerTileMaterial(opts);
  }

  /**
   * Releases the material back into the pool.
   *
   * @param material - The material.
   */
  static release(material) {
    material.reset();
    if (POOL.length < POOL_SIZE) {
      POOL.push(material);
    } else {
      material.dispose();
    }
  }
}
export function isComposerTileMaterial(obj) {
  return obj?.isComposerTileMaterial;
}
export default ComposerTileMaterial;