/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */

/**
 * Adapted from original code by https://github.com/zz85
 *
 * Based on "A Practical Analytic Model for Daylight"
 * aka The Preetham Model, the de facto standard analytic skydome model
 * http://www.cs.utah.edu/~shirley/papers/sunsky/sunsky.pdf
 *
 * First implemented by Simon Wallner
 * http://www.simonwallner.at/projects/atmospheric-scattering
 *
 * Improved by Martin Upitis
 * http://blenderartists.org/forum/showthread.php?245954-preethams-sky-impementation-HDR
 *
 * THREE.js integration by zz85 http://twitter.com/blurspline
 */

import { BackSide, MathUtils, Mesh, ShaderMaterial, SphereGeometry, Uniform, UniformsUtils, Vector3 } from 'three';
/* babel-plugin-inline-import './shader/SkyDomeFS.glsl' */
const SkyDomeFS = "varying vec3 vWorldPosition;\n\nuniform vec3 sunPosition;\n\nuniform float skyDomeLuminance;\nuniform float turbidity;\nuniform float rayleighCoefficient;\nuniform float mieCoefficient;\nuniform float mieDirectionalG;\nuniform float sunAngularDiameterCos;\n\nuniform vec3 up;\n// original value = 0.999956676946448443553574619906976478926848692873900859324;\n// 66 arc seconds -> degrees, and the cosine of that\n\n// constants for atmospheric scattering\nconst float e = 2.71828182845904523536028747135266249775724709369995957;\nconst float pi = 3.141592653589793238462643383279502884197169;\n\nconst float n = 1.0003; // refractive index of air\nconst float N = 2.545E25; // number of molecules per unit volume for air at\n// 288.15K and 1013mb (sea level -45 celsius)\nconst float pn = 0.035; // depolatization factor for standard air\n\n// wavelength of used primaries, according to preetham\nconst vec3 lambda = vec3(680E-9, 550E-9, 450E-9);\n\n// mie stuff\n// K coefficient for the primaries\nconst vec3 K = vec3(0.686, 0.678, 0.666);\nconst float v = 4.0;\n\n// optical length at zenith for molecules\nconst float rayleighZenithLength = 8.4E3;\nconst float mieZenithLength = 1.25E3;\n\nconst float EE = 1000.0;\n\n// earth shadow hack\nconst float cutoffAngle = pi / 1.95;\nconst float steepness = 1.5;\n\nvec3 totalRayleigh(vec3 lambda) {\n    return (8.0 * pow(pi, 3.0) * pow(pow(n, 2.0) - 1.0, 2.0) * (6.0 + 3.0 * pn)) / (3.0 * N * pow(lambda, vec3(4.0)) * (6.0 - 7.0 * pn));\n}\n\n// see http://blenderartists.org/forum/showthread.php?321110-Shaders-and-Skybox-madness\n// A simplied version of the total Reayleigh scattering to works on browsers that use ANGLE\nvec3 simplifiedRayleigh() {\n    return 0.0005 / vec3(94, 40, 18);\n        // return 0.00054532832366 / (3.0 * 2.545E25 * pow(vec3(680E-9, 550E-9, 450E-9), vec3(4.0)) * 6.245);\n}\n\nfloat rayleighPhase(float cosTheta) {\n    return (3.0 / (16.0 * pi)) * (1.0 + pow(cosTheta, 2.0));\n}\n\nvec3 totalMie(vec3 lambda, vec3 K, float T) {\n    float c = (0.2 * T) * 10E-18;\n    return 0.434 * c * pi * pow((2.0 * pi) / lambda, vec3(v - 2.0)) * K;\n}\n\nfloat hgPhase(float cosTheta, float g) {\n    return (1.0 / (4.0 * pi)) * ((1.0 - pow(g, 2.0)) / pow(1.0 - 2.0 * g * cosTheta + pow(g, 2.0), 1.5));\n}\n\nfloat sunIntensity(float zenithAngleCos) {\n    float angle = cutoffAngle - acos(zenithAngleCos);\n\n    float exp = exp(-(angle / steepness));\n\n    return EE * max(0.0, 1.0 - exp);\n}\n\n// Filmic ToneMapping http://filmicgames.com/archives/75\nfloat A = 0.15;\nfloat B = 0.50;\nfloat C = 0.10;\nfloat D = 0.20;\nfloat E = 0.02;\nfloat F = 0.30;\nfloat W = 1000.0;\n\nvec3 Uncharted2Tonemap(vec3 x) {\n    return ((x * (A * x + C * B) + D * E) / (x * (A * x + B) + D * F)) - E / F;\n}\n\nconst float earthRadius = 6400000.0;\n\nvoid main() {\n    // The direction toward the sun\n    vec3 sunDirection = normalize(sunPosition - cameraPosition);\n\n    // The direction toward the fragment's location in the sky\n    vec3 skyDirection = normalize(vWorldPosition - cameraPosition);\n\n    // The angle between the sun and the up vector: (sunset = 1, zenith = 0)\n    float zenithAngleCos = dot(sunDirection, up);\n\n    // Sun fade: the fading intensity of the sun, depends on the sun angle\n    float sunfade = 1.0 - clamp(1.0 - exp(zenithAngleCos), 0.0, 1.0);\n\n    //  The Rayleigh coefficient combined with sun fade\n    float rayleighCoefficient2 = rayleighCoefficient - (1.0 * (1.0 - sunfade));\n\n    // The sun intensity depending on the sun angle\n    float sunE = sunIntensity(zenithAngleCos);\n\n    // extinction (absorbtion + out scattering)\n    // rayleigh coefficients\n    vec3 betaR = simplifiedRayleigh() * rayleighCoefficient2;\n\n    // Mie coefficients\n    vec3 betaM = totalMie(lambda, K, turbidity) * mieCoefficient;\n\n    // optical length\n    // cutoff angle at 90 to avoid singularity in next formula.\n    float a = dot(up, skyDirection);\n    float zenithAngle = acos(max(0.0, a));\n    float cosZenithAngle = cos(zenithAngle);\n\n    float sR = rayleighZenithLength / (cosZenithAngle + 0.15 * pow(93.885 - ((zenithAngle * 180.0) / pi), -1.253));\n    float sM = mieZenithLength / (cosZenithAngle + 0.15 * pow(93.885 - ((zenithAngle * 180.0) / pi), -1.253));\n\n    // combined extinction factor\n    vec3 Fex = exp(-(betaR * sR + betaM * sM));\n\n    // in scattering\n    float cosTheta = dot(skyDirection, sunDirection);\n\n    float rPhase = rayleighPhase(cosTheta * 0.5 + 0.5);\n    vec3 betaRTheta = betaR * rPhase;\n\n    float mPhase = hgPhase(cosTheta, mieDirectionalG);\n    vec3 betaMTheta = betaM * mPhase;\n\n    vec3 skyColor = pow(sunE * ((betaRTheta + betaMTheta) / (betaR + betaM)) * (1.0 - Fex), vec3(1.5));\n    skyColor *= mix(vec3(1.0), pow(sunE * ((betaRTheta + betaMTheta) / (betaR + betaM)) * Fex, vec3(1.0 / 2.0)), clamp(pow(1.0 - dot(up, sunDirection), 5.0), 0.0, 1.0));\n\n    vec3 sunDiscColor = vec3(0.1) * Fex;\n\n    // composition + solar disc\n    //if (cosTheta > sunAngularDiameterCos)\n    float sundisk = smoothstep(sunAngularDiameterCos, sunAngularDiameterCos * 1.2, cosTheta);\n    // if (normalize(vWorldPosition - cameraPosition).y>0.0)\n    sunDiscColor += (sunE * 19000.0 * Fex) * sundisk;\n\n    vec3 whiteScale = 1.0 / Uncharted2Tonemap(vec3(W));\n\n    vec3 texColor = (skyColor + sunDiscColor);\n    texColor *= 0.04;\n    texColor += vec3(0.0, 0.001, 0.0025) * 0.3;\n\n    float g_fMaxLuminance = 1.0;\n    float fLumScaled = 0.1 / skyDomeLuminance;\n    float fLumCompressed = (fLumScaled * (1.0 + (fLumScaled / (g_fMaxLuminance * g_fMaxLuminance)))) / (1.0 + fLumScaled);\n\n    float ExposureBias = fLumCompressed;\n\n    vec3 curr = Uncharted2Tonemap((log2(2.0 / pow(skyDomeLuminance, 4.0))) * texColor);\n    vec3 color = curr * whiteScale;\n\n    vec3 retColor = pow(color, vec3(1.0 / (1.2 + (1.2 * sunfade))));\n\n    gl_FragColor.rgb = retColor;\n\n    gl_FragColor.a = 1. - ((length(cameraPosition) - earthRadius) / 1000.);\n}\n";
/* babel-plugin-inline-import './shader/SkyDomeVS.glsl' */
const SkyDomeVS = "varying vec3 vWorldPosition;\n\nvoid main() {\n    vec4 worldPosition = modelMatrix * vec4(cameraPosition + position, 1.0);\n\n    vWorldPosition = worldPosition.xyz;\n\n    gl_Position = projectionMatrix * modelViewMatrix * vec4(cameraPosition + position, 1.0);\n}\n";
const defaultUniforms = {
  skyDomeLuminance: new Uniform(1),
  turbidity: new Uniform(1.7),
  rayleighCoefficient: new Uniform(1.13),
  mieCoefficient: new Uniform(0.0019),
  mieDirectionalG: new Uniform(0.99),
  sunPosition: new Uniform(new Vector3()),
  up: new Uniform(new Vector3()),
  sunAngularDiameterCos: new Uniform(Math.cos(MathUtils.degToRad(1)))
};
const DEFAULT_ATMOSPHERE_THICKNESS = 40_000;
class SkyDome extends Mesh {
  isSkyDome = true;
  type = 'SkyDome';
  set(key, value) {
    this.uniforms[key].value = value;
  }
  get(key) {
    return this.uniforms[key].value;
  }

  /**
   * The cosine of the solar disc's apparent diameter, in degrees.
   */
  get sunAngularDiameterCos() {
    return this.get('sunAngularDiameterCos');
  }
  set sunAngularDiameterCos(v) {
    this.set('sunAngularDiameterCos', v);
  }
  get luminance() {
    return this.get('skyDomeLuminance');
  }
  set luminance(v) {
    this.set('skyDomeLuminance', v);
  }
  get turbidity() {
    return this.get('turbidity');
  }
  set turbidity(v) {
    this.set('turbidity', v);
  }
  get rayleighCoefficient() {
    return this.get('rayleighCoefficient');
  }
  set rayleighCoefficient(v) {
    this.set('rayleighCoefficient', v);
  }
  get mieCoefficient() {
    return this.get('mieCoefficient');
  }
  set mieCoefficient(v) {
    this.set('mieCoefficient', v);
  }
  get mieDirectionalG() {
    return this.get('mieDirectionalG');
  }
  set mieDirectionalG(v) {
    this.set('mieDirectionalG', v);
  }
  constructor(params) {
    super(new SphereGeometry(params?.atmosphereThickness ?? DEFAULT_ATMOSPHERE_THICKNESS, 64, 32), new ShaderMaterial({
      fragmentShader: SkyDomeFS,
      vertexShader: SkyDomeVS,
      uniforms: UniformsUtils.clone(defaultUniforms),
      side: BackSide,
      depthTest: false,
      depthWrite: false
    }));
    this.frustumCulled = false;
    this.uniforms = this.material.uniforms;
  }
  onBeforeRender(renderer, scene, camera) {
    this.uniforms.up.value.copy(camera.up);
  }
}
export default SkyDome;