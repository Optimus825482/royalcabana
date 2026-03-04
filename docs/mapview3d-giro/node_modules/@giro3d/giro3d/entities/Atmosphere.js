/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */

import { AdditiveBlending, BackSide, Mesh, ShaderMaterial, Sphere, SphereGeometry, Texture, Uniform, Vector3 } from 'three';
import Ellipsoid from '../core/geographic/Ellipsoid';
/* babel-plugin-inline-import '../renderer/shader/GroundFS.glsl' */
const GroundFS = "varying vec3 c0;\nvarying vec3 c1;\nuniform float opacity;\n\nvoid main (void) {\n\tgl_FragColor = vec4(c1, 1.0 - c0 / 4.0);\n\tgl_FragColor.a *= opacity;\n}";
/* babel-plugin-inline-import '../renderer/shader/GroundVS.glsl' */
const GroundVS = "uniform vec3 v3LightPosition;   // The direction vector to the light source\nuniform vec3 v3InvWavelength;   // 1 / pow(wavelength, 4) for the red, green, and blue channels\nuniform float fCameraHeight;    // The camera's current height\nuniform float fCameraHeight2;   // fCameraHeight^2\nuniform float fOuterRadius;     // The outer (atmosphere) radius\nuniform float fOuterRadius2;    // fOuterRadius^2\nuniform float fInnerRadius;     // The inner (planetary) radius\nuniform float fInnerRadius2;    // fInnerRadius^2\nuniform float fKrESun;          // Kr * ESun\nuniform float fKmESun;          // Km * ESun\nuniform float fKr4PI;           // Kr * 4 * PI\nuniform float fKm4PI;           // Km * 4 * PI\nuniform float fScale;           // 1 / (fOuterRadius - fInnerRadius)\nuniform float fScaleDepth;      // The scale depth (i.e. the altitude at which the atmosphere's average density is found)\nuniform float fScaleOverScaleDepth; // fScale / fScaleDepth\n\nvarying vec3 c0;\nvarying vec3 c1;\n\nconst int nSamples = 3;\nconst float fSamples = 3.0;\n\nfloat scale(float fCos)\n{\n    float x = 1.0 - fCos;\n    return fScaleDepth * exp(-0.00287 + x*(0.459 + x*(3.83 + x*(-6.80 + x*5.25))));\n}\n\nvoid main(void) {\n\n     float cameraHeight2 = length(cameraPosition) * length(cameraPosition);\n\n    // Get the ray from the camera to the vertex and its length (which is the far point of the ray passing through the atmosphere)\n    vec3 v3Ray = position - cameraPosition;\n    float fFar = length(v3Ray);\n    v3Ray /= fFar;\n\n    // Calculate the closest intersection of the ray with the outer atmosphere (which is the near point of the ray passing through the atmosphere)\n    float B = 2.0 * dot(cameraPosition, v3Ray);\n    float C = cameraHeight2 - fOuterRadius2;\n    float fDet = max(0.0, B*B - 4.0 * C);\n    float fNear = 0.5 * (-B - sqrt(fDet));\n\n    // Calculate the ray's starting position, then calculate its scattering offset\n    vec3 v3Start = cameraPosition + v3Ray * fNear;\n    fFar -= fNear;\n    float fDepth = exp((fInnerRadius - fOuterRadius) / fScaleDepth);\n    float fCameraAngle = dot(-v3Ray, position) / length(position);\n    float fLightAngle = dot(v3LightPosition, position) / length(position);\n    float fCameraScale = scale(fCameraAngle);\n    float fLightScale = scale(fLightAngle);\n    float fCameraOffset = fDepth*fCameraScale;\n    float fTemp = (fLightScale + fCameraScale);\n\n    // Initialize the scattering loop variables\n    float fSampleLength = fFar / fSamples;\n    float fScaledLength = fSampleLength * fScale;\n    vec3 v3SampleRay = v3Ray * fSampleLength;\n    vec3 v3SamplePoint = v3Start + v3SampleRay * 0.5;\n\n    // Now loop through the sample rays\n    vec3 v3FrontColor = vec3(0.0, 0.0, 0.0);\n    vec3 v3Attenuate = vec3(0.0, 0.0, 0.0);\n    for(int i=0; i<nSamples; i++)\n    {\n        float fHeight = length(v3SamplePoint);\n        float fDepth = exp(fScaleOverScaleDepth * (fInnerRadius - fHeight));\n        float fScatter = fDepth*fTemp - fCameraOffset;\n        v3Attenuate = exp(-fScatter * (v3InvWavelength * fKr4PI + fKm4PI));\n        v3FrontColor += v3Attenuate * (fDepth * fScaledLength);\n        v3SamplePoint += v3SampleRay;\n    }\n\n    // Calculate the attenuation factor for the ground\n    c0 = v3Attenuate;\n    c1 = v3FrontColor * (v3InvWavelength * fKrESun + fKmESun);\n\n    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n}";
/* babel-plugin-inline-import '../renderer/shader/SkyFS.glsl' */
const SkyFS = "uniform vec3 v3LightPosition;\nuniform float g;\nuniform float g2;\nuniform float opacity;\n\nvarying vec3 v3Direction;\nvarying vec3 c0;\nvarying vec3 c1;\n\n// Calculates the Mie phase function\nfloat getMiePhase(float fCos, float fCos2, float g, float g2) {\n    return 1.5 * ((1.0 - g2) / (2.0 + g2)) * (1.0 + fCos2) / pow(1.0 + g2 - 2.0 * g * fCos, 1.5);\n}\n\n// Calculates the Rayleigh phase function\nfloat getRayleighPhase(float fCos2) {\n    return 0.75 + 0.75 * fCos2;\n}\n\nvoid main (void) {\n    float fCos = dot(v3LightPosition, v3Direction) / length(v3Direction);\n    float fCos2 = fCos * fCos;\n\n    vec3 color = getRayleighPhase(fCos2) * c0 + getMiePhase(fCos, fCos2, g, g2) * c1;\n\n    gl_FragColor = vec4(color, 1.0);\n    gl_FragColor.a = gl_FragColor.b * opacity;\n}";
/* babel-plugin-inline-import '../renderer/shader/SkyVS.glsl' */
const SkyVS = "uniform vec3 v3LightPosition;   // The direction vector to the light source\nuniform vec3 v3InvWavelength;   // 1 / pow(wavelength, 4) for the red, green, and blue channels\nuniform float fCameraHeight;    // The camera's current height\nuniform float fCameraHeight2;   // fCameraHeight^2\nuniform float fOuterRadius;     // The outer (atmosphere) radius\nuniform float fOuterRadius2;    // fOuterRadius^2\nuniform float fInnerRadius;     // The inner (planetary) radius\nuniform float fInnerRadius2;    // fInnerRadius^2\nuniform float fKrESun;          // Kr * ESun\nuniform float fKmESun;          // Km * ESun\nuniform float fKr4PI;           // Kr * 4 * PI\nuniform float fKm4PI;           // Km * 4 * PI\nuniform float fScale;           // 1 / (fOuterRadius - fInnerRadius)\nuniform float fScaleDepth;      // The scale depth (i.e. the altitude at which the atmosphere's average density is found)\nuniform float fScaleOverScaleDepth; // fScale / fScaleDepth\n\nconst int nSamples = 3;\nconst float fSamples = 3.0;\n\nvarying vec3 v3Direction;\nvarying vec3 c0;\nvarying vec3 c1;\n\nfloat scale(float fCos) {\n    float x = 1.0 - fCos;\n    return fScaleDepth * exp(-0.00287 + x*(0.459 + x*(3.83 + x*(-6.80 + x*5.25))));\n}\n\nvoid main(void) {\n    float lengthCamera = length(cameraPosition);\n    float cameraHeight2 = lengthCamera * lengthCamera;\n\n    // Get the ray from the camera to the vertex and its length (which is the far point of the ray passing through the atmosphere)\n    vec3 v3Ray = position - cameraPosition;\n    float fFar = length(v3Ray);\n    v3Ray /= fFar;\n\n    // Calculate the closest intersection of the ray with the outer atmosphere (which is the near point of the ray passing through the atmosphere)\n    float B = 2.0 * dot(cameraPosition, v3Ray);\n    float C = cameraHeight2 - fOuterRadius2;\n    float fDet = max(0.0, B*B - 4.0 * C);\n    float fNear = 0.5 * (-B - sqrt(fDet));\n\n    // Calculate the ray's starting position, then calculate its scattering offset\n    vec3 v3Start = cameraPosition + v3Ray * fNear;\n    fFar -= fNear;\n    float fStartAngle = dot(v3Ray, v3Start) / fOuterRadius;\n    float fStartDepth = exp(-1.0 / fScaleDepth);\n    float fStartOffset = fStartDepth * scale(fStartAngle);\n\n    // Initialize the scattering loop variables\n    float fSampleLength = fFar / fSamples;\n    float fScaledLength = fSampleLength * fScale;\n    vec3 v3SampleRay = v3Ray * fSampleLength;\n    vec3 v3SamplePoint = v3Start + v3SampleRay * 0.5;\n\n    // Now loop through the sample rays\n    vec3 v3FrontColor = vec3(0.0, 0.0, 0.0);\n    for(int i=0; i<nSamples; i++)\n    {\n        float fHeight = length(v3SamplePoint);\n        float fDepth = exp(fScaleOverScaleDepth * (fInnerRadius - fHeight));\n        float fLightAngle = dot(v3LightPosition, v3SamplePoint) / fHeight;\n        float fCameraAngle = dot(v3Ray, v3SamplePoint) / fHeight;\n        float fScatter = (fStartOffset + fDepth * (scale(fLightAngle) - scale(fCameraAngle)));\n        vec3 v3Attenuate = exp(-fScatter * (v3InvWavelength * fKr4PI + fKm4PI));\n\n        v3FrontColor += v3Attenuate * (fDepth * fScaledLength);\n        v3SamplePoint += v3SampleRay;\n    }\n\n    // Finally, scale the Mie and Rayleigh colors and set up the varying variables for the pixel shader\n    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n    c0 = v3FrontColor * (v3InvWavelength * fKrESun);\n    c1 = v3FrontColor * fKmESun;\n    v3Direction = cameraPosition - position;\n}";
import { isShaderMaterial } from '../utils/predicates';
import Entity3D from './Entity3D';
const tmpVec3 = new Vector3();
const tmpPos = new Vector3();

/**
 * Constructor options for the {@link Atmosphere} entity.
 */

/**
 * Displays an atmosphere around an ellipsoid.
 *
 * The entity is made of two components:
 * - `.inner`, which represents the atmosphere inside the ring and acts as a "veil",
 * - `.outer`, which represents the visible halo on the edge of the ring
 */
export default class Atmosphere extends Entity3D {
  isAtmosphere = true;
  type = 'Atmosphere';
  _wavelengths = [0.65, 0.57, 0.475];
  _disposed = false;
  get ellipsoid() {
    return this._ellipsoid;
  }
  get redWavelength() {
    return this._wavelengths[0];
  }
  set redWavelength(v) {
    this._wavelengths[0] = v;
    this._sphereUniforms.v3InvWavelength.value.x = 1 / Math.pow(v, 4);
    this.notifyChange();
  }
  get greenWavelength() {
    return this._wavelengths[1];
  }
  set greenWavelength(v) {
    this._wavelengths[1] = v;
    this._sphereUniforms.v3InvWavelength.value.y = 1 / Math.pow(v, 4);
    this.notifyChange();
  }
  get blueWavelength() {
    return this._wavelengths[2];
  }
  set blueWavelength(v) {
    this._wavelengths[2] = v;
    this._sphereUniforms.v3InvWavelength.value.z = 1 / Math.pow(v, 4);
    this.notifyChange();
  }
  get outer() {
    return this._outer;
  }
  get inner() {
    return this._inner;
  }
  constructor(options) {
    super(options);
    this._ellipsoid = options?.ellipsoid ?? Ellipsoid.WGS84;
    const radius = this._ellipsoid.semiMajorAxis;
    this._wavelengths = options?.wavelengths ?? this._wavelengths;
    this._sphere = new Sphere(new Vector3(0, 0, 0), radius);
    const thickness = options?.thickness ?? 300_000;
    const atmosphere = {
      Kr: 0.0025,
      Km: 0.001,
      ESun: 20.0,
      g: -0.95,
      innerRadius: radius,
      outerRadius: radius + thickness,
      scaleDepth: 0.25,
      mieScaleDepth: 0.1
    };
    this._sphereUniforms = {
      opacity: new Uniform(1),
      v3LightPosition: new Uniform(new Vector3(1, 0, 0)),
      v3InvWavelength: new Uniform(new Vector3(1 / Math.pow(this._wavelengths[0], 4), 1 / Math.pow(this._wavelengths[1], 4), 1 / Math.pow(this._wavelengths[2], 4))),
      fCameraHeight: new Uniform(0),
      fCameraHeight2: new Uniform(0),
      fInnerRadius: new Uniform(atmosphere.innerRadius),
      fInnerRadius2: new Uniform(atmosphere.innerRadius * atmosphere.innerRadius),
      fOuterRadius: new Uniform(atmosphere.outerRadius),
      fOuterRadius2: new Uniform(atmosphere.outerRadius * atmosphere.outerRadius),
      fKrESun: new Uniform(atmosphere.Kr * atmosphere.ESun),
      fKmESun: new Uniform(atmosphere.Km * atmosphere.ESun),
      fKr4PI: new Uniform(atmosphere.Kr * 4.0 * Math.PI),
      fKm4PI: new Uniform(atmosphere.Km * 4.0 * Math.PI),
      fScale: new Uniform(1 / (atmosphere.outerRadius - atmosphere.innerRadius)),
      fScaleDepth: new Uniform(atmosphere.scaleDepth),
      fScaleOverScaleDepth: {
        value: 1 / (atmosphere.outerRadius - atmosphere.innerRadius) / atmosphere.scaleDepth
      },
      g: new Uniform(atmosphere.g),
      g2: new Uniform(atmosphere.g * atmosphere.g),
      nSamples: new Uniform(3),
      fSamples: new Uniform(3.0),
      tDisplacement: new Uniform(new Texture()),
      tSkyboxDiffuse: new Uniform(new Texture()),
      fNightScale: new Uniform(1.0)
    };
    const innerGeometry = new SphereGeometry(atmosphere.innerRadius, 64, 32);
    const innerMaterial = new ShaderMaterial({
      uniforms: this._sphereUniforms,
      vertexShader: GroundVS,
      fragmentShader: GroundFS,
      blending: AdditiveBlending,
      transparent: true,
      depthTest: false,
      depthWrite: false
    });
    this._inner = new Mesh(innerGeometry, innerMaterial);
    this._inner.name = 'inner';
    this._inner.visible = true;
    const outerGeometry = new SphereGeometry(atmosphere.outerRadius, 128, 64);
    const outerMaterial = new ShaderMaterial({
      uniforms: this._sphereUniforms,
      vertexShader: SkyVS,
      fragmentShader: SkyFS,
      transparent: true,
      side: BackSide
    });
    this._outer = new Mesh(outerGeometry, outerMaterial);
    this._outer.name = 'outer';
    this._outer.visible = true;
    this.object3d.add(this._inner);
    this.object3d.add(this._outer);
    this.object3d.updateMatrixWorld(true);
    this.updateOpacity();
    this.updateRenderOrder();
    this.object3d.scale.set(1, 1, this._ellipsoid.compressionFactor);
    this.object3d.updateMatrixWorld(true);
  }
  updateOpacity() {
    this.traverseMaterials(m => {
      if (isShaderMaterial(m)) {
        if (m.uniforms.opacity != null) {
          m.uniforms.opacity.value = this.opacity;
        }
      }
    });
  }
  updateMinMaxDistance(context) {
    const distance = context.distance.plane.distanceToPoint(this.object3d.position);
    const radius = this._sphere.radius * 2;
    this._distance.min = Math.min(this._distance.min, distance - radius);
    this._distance.max = Math.max(this._distance.max, distance + radius);
  }
  postUpdate(context) {
    this.updateMinMaxDistance(context);
  }
  pick() {
    // Atmosphere is not pickable.
    return [];
  }

  /**
   * Sets the position of the sun.
   */
  setSunPosition(position) {
    tmpPos.copy(position);
    const direction = tmpPos.sub(this.object3d.getWorldPosition(tmpVec3)).normalize();
    this._outer.material.uniforms.v3LightPosition.value.copy(direction);
    this._inner.material.uniforms.v3LightPosition.value.copy(direction);
    this.notifyChange(this);
  }
  dispose() {
    if (this._disposed) {
      return;
    }
    this._outer.material.dispose();
    this._outer.geometry.dispose();
    this._inner.material.dispose();
    this._inner.geometry.dispose();
    this.object3d.clear();
    this._disposed = true;
  }
}