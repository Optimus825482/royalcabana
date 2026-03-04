/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */

import { GlobeControls as WrappedControls, Ellipsoid as WrappedEllipsoid } from '3d-tiles-renderer';
import { EventDispatcher } from 'three';
import Ellipsoid from '../core/geographic/Ellipsoid';
/**
 * Camera controls for a {@link Globe}. Internally, this wraps `3d-tiles-renderer`'s own `GlobeControls`.
 */
export default class GlobeControls extends EventDispatcher {
  constructor(params) {
    super();
    const {
      scene,
      camera,
      domElement
    } = params;
    this._domElement = domElement;
    this._camera = camera;
    this._eventListeners = {
      change: () => this.dispatchEvent({
        type: 'change'
      }),
      start: () => this.dispatchEvent({
        type: 'start'
      }),
      end: () => this.dispatchEvent({
        type: 'end'
      })
    };
    const ellipsoid = params.ellipsoid ?? Ellipsoid.WGS84;
    this._controls = new WrappedControls(scene, camera, domElement);
    this._controls.setEllipsoid(new WrappedEllipsoid(ellipsoid.semiMajorAxis, ellipsoid.semiMajorAxis, ellipsoid.semiMinorAxis), null);
    this._controls.minDistance = params.minDistance ?? this._controls.minDistance;
    this._controls.maxDistance = params.maxDistance ?? this._controls.maxDistance;
    this._controls.zoomSpeed = params.zoomSpeed ?? this._controls.zoomSpeed;
    this._controls.enableDamping = params.enableDamping ?? this._controls.enableDamping;
    this._controls.dampingFactor = params.dampingFactor ?? this._controls.dampingFactor;
    this._controls.addEventListener('start', this._eventListeners.start);
    this._controls.addEventListener('end', this._eventListeners.end);
    this._controls.addEventListener('change', this._eventListeners.change);
  }
  get enabled() {
    return this._controls.enabled;
  }
  set enabled(v) {
    this._controls.enabled = v;
  }
  get enableDamping() {
    return this._controls.enableDamping;
  }
  set enableDamping(v) {
    this._controls.enableDamping = v;
  }
  get dampingFactor() {
    return this._controls.dampingFactor;
  }
  set dampingFactor(v) {
    this._controls.dampingFactor = v;
  }
  get minAltitude() {
    return this._controls.minAltitude;
  }
  set minAltitude(v) {
    this._controls.minAltitude = v;
  }

  /**
   * The zoom speed.
   * @defaultValue 1
   */
  get zoomSpeed() {
    return this._controls.zoomSpeed;
  }
  set zoomSpeed(v) {
    this._controls.zoomSpeed = v;
  }

  /**
   * The minimal distance to the ellipsoid surface allowed for the controls.
   * @defaultValue 0 (the ellipsoid surface)
   */
  get minDistance() {
    return this._controls.minDistance;
  }
  set minDistance(v) {
    this._controls.minDistance = v;
  }

  /**
   * The maximal distance to the ellipsoid surface allowed for the controls.
   * @defaultValue infinity
   */
  get maxDistance() {
    return this._controls.maxDistance;
  }
  set maxDistance(v) {
    this._controls.maxDistance = v;
  }

  /**
   * The maximum zoom value (orthographic cameras only).
   */
  get maxZoom() {
    return this._controls.maxZoom;
  }
  set maxZoom(v) {
    this._controls.maxZoom = v;
  }

  /**
   * The minimum zoom value (orthographic cameras only).
   */
  get minZoom() {
    return this._controls.minZoom;
  }
  set minZoom(v) {
    this._controls.minZoom = v;
  }
  update(deltaTime) {
    // The controls adjust the clipping planes, but we don't want that.
    // https://github.com/NASA-AMMOS/3DTilesRendererJS/pull/1066
    const near = this._camera.near;
    const far = this._camera.far;
    this._controls.update(deltaTime);
    this._camera.near = near;
    this._camera.far = far;
  }

  /**
   * Attaches event listeners to the DOM element.
   * If the event listeners are already attached, this will throw an error.
   */
  attach() {
    this._controls.attach(this._domElement);
  }

  /**
   * Detaches event listeners from the DOM element.
   */
  detach() {
    this._controls.detach();
  }
  dispose() {
    this._controls.removeEventListener('change', this._eventListeners.change);
    this._controls.dispose();
  }
  resetState() {
    this._controls.resetState();
  }
}