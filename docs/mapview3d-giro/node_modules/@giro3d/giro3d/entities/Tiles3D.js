/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */

import { TilesRenderer } from '3d-tiles-renderer';
import { DebugTilesPlugin, GLTFExtensionsPlugin, ImplicitTilingPlugin, UnloadTilesPlugin } from '3d-tiles-renderer/plugins';
import { Box3, Color, REVISION, Vector3 } from 'three';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { defaultColorimetryOptions } from '../core/ColorimetryOptions';
import ColorMap from '../core/ColorMap';
import Extent from '../core/geographic/Extent';
import { getGeometryMemoryUsage } from '../core/MemoryUsage';
import PointCloudMaterial, { ASPRS_CLASSIFICATIONS, MODE } from '../renderer/PointCloudMaterial';
import { isBufferGeometry, isObject3D } from '../utils/predicates';
import { nonNull } from '../utils/tsutils';
import FetchPlugin from './3dtiles/FetchPlugin';
import { DEFAULT_TILES3D_POINTCLOUD_ATTRIBUTE_MAPPING } from './3dtiles/PointCloudParameters';
import PointCloudPlugin, { isPNTSScene } from './3dtiles/PointCloudPlugin';
import Entity3D from './Entity3D';
export { DEFAULT_TILES3D_POINTCLOUD_ATTRIBUTE_MAPPING };

/**
 * Constructor options for the {@link Tiles3D} entity.
 */

const tmpBox3 = new Box3();
const tmpVector = new Vector3();
export function isLayerNode(obj) {
  if (obj == null) {
    return false;
  }
  if ('material' in obj && PointCloudMaterial.isPointCloudMaterial(obj.material)) {
    return true;
  }
  return false;
}

/**
 * Types of results for picking on {@link Tiles3D}.
 *
 * If Tiles3D uses {@link PointCloudMaterial}, then results will be of {@link PointsPickResult}.
 * Otherwise, they will be of {@link PickResult}.
 */

const perInstanceSharedResources = new Map();
function getSharedResources(instance) {
  return perInstanceSharedResources.get(instance) ?? null;
}
function setSharedResources(instance, resources) {
  if (perInstanceSharedResources.has(instance)) {
    return;
  }
  perInstanceSharedResources.set(instance, resources);
  instance.addEventListener('dispose', e => perInstanceSharedResources.delete(e.target));
}
/**
 * Displays a [3D Tiles Tileset](https://www.ogc.org/publications/standard/3dtiles/). This entity
 * uses the [3d-tiles-renderer](https://github.com/NASA-AMMOS/3DTilesRendererJS) package.
 *
 * Note: shadow maps are supported, but require vertex normals on displayed objects, which
 * depends on the data. Many tilesets do not have vertex normals, as they increase the
 * size of the dataset.
 */
export default class Tiles3D extends Entity3D {
  isPickable = true;
  hasLayers = true;
  isTiles3D = true;
  type = 'Tiles3D';
  _debugOptions = {
    displayBoxBounds: false,
    displaySphereBounds: false,
    displayRegionBounds: false
  };

  // Settings that only applies to point cloud tiles
  _pointCloudParameters = {
    pointSize: 0,
    // Automatic size
    pointCloudMode: MODE.COLOR,
    colorimetry: defaultColorimetryOptions(),
    overlayColor: null,
    attributeMapping: DEFAULT_TILES3D_POINTCLOUD_ATTRIBUTE_MAPPING,
    pointCloudColorMap: new ColorMap({
      colors: [new Color('black'), new Color('white')],
      min: 0,
      max: 100
    }),
    classifications: ASPRS_CLASSIFICATIONS.map(c => c.clone())
  };
  _objectOptions = {
    castShadow: false,
    receiveShadow: false
  };
  _colorLayer = null;
  constructor(options) {
    super(options);
    this._tiles = new TilesRenderer(options?.url);
    this._tiles.errorTarget = options?.errorTarget ?? 8;
    this.object3d.add(this._tiles.group);
    this._listeners = {
      onModelLoaded: this.onModelLoaded.bind(this),
      onTileVisibilityChanged: this.onTileVisibilityChanged.bind(this),
      onColorMapUpdated: this.onColorMapUpdated.bind(this),
      onTileDisposed: this.onTileDisposed.bind(this)
    };
    this._tiles.addEventListener('load-model', this._listeners.onModelLoaded);
    this._tiles.addEventListener('tile-visibility-change', this._listeners.onTileVisibilityChanged);
    this._tiles.addEventListener('dispose-model', this._listeners.onTileDisposed);
    this._debugPlugin = new DebugTilesPlugin();
    this._tiles.registerPlugin(this._debugPlugin);
    this.updateDebugPluginState();
    this._tiles.registerPlugin(new ImplicitTilingPlugin());
    this._tiles.registerPlugin(new UnloadTilesPlugin({
      delay: 5000,
      bytesTarget: +Infinity
    }));

    // Giro3D specific plugins
    this._fetchPlugin = new FetchPlugin();
    this._pointCloudPlugin = new PointCloudPlugin(this._pointCloudParameters);
    this._tiles.registerPlugin(this._pointCloudPlugin);
    this._tiles.registerPlugin(this._fetchPlugin);
    const dracoLoader = new DRACOLoader(this._tiles.manager).setDecoderPath(options?.dracoDecoderPath ?? `https://unpkg.com/three@0.${REVISION}.0/examples/jsm/libs/draco/gltf/`);
    const ktxLoader = new KTX2Loader(this._tiles.manager).setTranscoderPath(options?.ktx2DecoderPath ?? `https://unpkg.com/three@0.${REVISION}.0/examples/jsm/libs/basis/`);
    this._ktx2Loader = ktxLoader;
    this._tiles.registerPlugin(new GLTFExtensionsPlugin({
      dracoLoader,
      ktxLoader,
      meshoptDecoder: MeshoptDecoder
    }));
    this._pointCloudParameters.pointCloudMode = options?.pointCloudMode ?? this._pointCloudParameters.pointCloudMode;
    this._pointCloudParameters.pointSize = options?.pointSize ?? this._pointCloudParameters.pointSize;
    this._pointCloudParameters.pointCloudColorMap = options?.colorMap ?? this._pointCloudParameters.pointCloudColorMap;
    this._pointCloudParameters.classifications = options?.classifications ?? this._pointCloudParameters.classifications;
    this._pointCloudParameters.attributeMapping = options?.pointCloudAttributeMapping ?? this._pointCloudParameters.attributeMapping;
    this._pointCloudParameters.pointCloudColorMap.addEventListener('updated', this._listeners.onColorMapUpdated);
  }

  /**
   * Returns the underlying renderer.
   */
  get tiles() {
    return this._tiles;
  }
  onRenderingContextRestored() {
    this.forEachLayer(layer => layer.onRenderingContextRestored());
    this.instance.notifyChange(this);
  }
  getBoundingBox() {
    const box = new Box3();
    this._tiles.getBoundingBox(box);
    return box;
  }
  getMemoryUsage(context) {
    this.traverse(obj => {
      if ('geometry' in obj && isBufferGeometry(obj.geometry)) {
        getGeometryMemoryUsage(context, obj.geometry);
      }
    });
    if (this.layerCount > 0) {
      this.forEachLayer(layer => {
        layer.getMemoryUsage(context);
      });
    }
  }
  get loading() {
    return this.tiles.loadProgress !== 1 || (this._colorLayer?.loading ?? false);
  }
  get progress() {
    let sum = this.tiles.loadProgress;
    let count = 1;
    if (this._colorLayer) {
      sum += this._colorLayer.progress;
      count = 2;
    }
    return sum / count;
  }
  updateObjectOption(key, value) {
    if (this._objectOptions[key] !== value) {
      this._objectOptions[key] = value;
      this.traverse(o => this.updateObject(o));
      this.notifyChange(this);
    }
  }

  /**
   * Toggles the `.castShadow` property on objects generated by this entity.
   *
   * Note: shadow maps require normal attributes on objects.
   */
  get castShadow() {
    return this._objectOptions.castShadow;
  }
  set castShadow(v) {
    this.updateObjectOption('castShadow', v);
  }

  /**
   * Toggles the `.receiveShadow` property on objects generated by this entity.
   *
   * Note: shadow maps require normal attributes on objects.
   */
  get receiveShadow() {
    return this._objectOptions.receiveShadow;
  }
  set receiveShadow(v) {
    this.updateObjectOption('receiveShadow', v);
  }
  getLayers(predicate) {
    if (this._colorLayer) {
      if (typeof predicate != 'function' || predicate(this._colorLayer)) {
        return [this._colorLayer];
      }
    }
    return [];
  }
  forEachLayer(callback) {
    if (this._colorLayer) {
      callback(this._colorLayer);
    }
  }
  removeColorLayer() {
    if (this._colorLayer) {
      this.dispatchEvent({
        type: 'layer-removed',
        layer: this._colorLayer
      });
      this.traverse(obj => {
        if (isLayerNode(obj)) {
          this._colorLayer?.unregisterNode(obj);
        }
      });
      this._colorLayer = null;
    }
  }

  /**
   * Sets the color layer used to colorize tiles.
   * Note: this feature only works with point cloud tiles.
   */
  async setColorLayer(layer) {
    if (this._colorLayer) {
      this.removeColorLayer();
    }
    this._colorLayer = layer;
    await layer.initialize({
      instance: this.instance,
      composerProjection: this.instance.coordinateSystem
    });
    this.dispatchEvent({
      type: 'layer-removed',
      layer
    });
  }
  get layerCount() {
    if (this._colorLayer) {
      return 1;
    }
    return 0;
  }
  updateOpacity() {
    this.traverseMaterials(material => {
      this.setMaterialOpacity(material);
    });
  }
  preprocess(opts) {
    return new Promise((resolve, reject) => {
      const instance = opts.instance;

      // Share resources between instances
      const shared = getSharedResources(instance);
      if (shared) {
        this._tiles.lruCache = shared.lruCache;
        this._tiles.downloadQueue = shared.downloadQueue;
        this._tiles.parseQueue = shared.parseQueue;
      } else {
        const toShare = {
          lruCache: this._tiles.lruCache,
          downloadQueue: this._tiles.downloadQueue,
          parseQueue: this._tiles.parseQueue
        };
        setSharedResources(instance, toShare);
      }
      const handlers = {
        success: () => {
          this._tiles.removeEventListener('load-content', handlers.success);
          this._tiles.removeEventListener('load-error', handlers.error);
          // The two next lines became necessary starting with
          // 3d-tile-renderer v0.4.8 but the actual reason is unclear.
          this._tiles.update();
          this.notifyChange(this);
          resolve();
        },
        error: error => {
          this._tiles.removeEventListener('load-content', handlers.success);
          this._tiles.removeEventListener('load-error', handlers.error);
          reject(error);
        }
      };
      this._tiles.addEventListener('load-content', handlers.success);
      this._tiles.addEventListener('load-error', handlers.error);
      const camera = instance.view.camera;
      if (this._tiles.hasCamera(camera) === false) {
        this._tiles.setCamera(camera);
        this._tiles.setResolutionFromRenderer(camera, instance.renderer);
      }
      this._ktx2Loader.detectSupport(instance.renderer);
      this._tiles.update();
      this.notifyChange(this);
    });
  }
  preUpdate(context) {
    if (this.frozen || !this.visible) {
      return null;
    }
    const camera = context.view.camera;
    this._tiles.setResolutionFromRenderer(camera, this.instance.renderer);
    this._tiles.update();
    return null;
  }
  postUpdate(context) {
    if (this.frozen || !this.visible) {
      return;
    }
    this.traverse(obj => {
      if (obj.visible) {
        this.updateCameraDistances(context, obj);
        if ('material' in obj && PointCloudMaterial.isPointCloudMaterial(obj.material)) {
          this._pointCloudPlugin.updateMaterial(obj.material);
          if (isLayerNode(obj)) {
            this.prepareLayerNode(obj);
            this.forEachLayer(layer => layer.update(context, obj));
          }
        }
      }
    });
    this.forEachLayer(layer => layer.postUpdate());
  }

  /**
   * Calculate and set the material opacity, taking into account this entity opacity and the
   * original opacity of the object.
   *
   * @param material - a material belonging to an object of this entity
   */
  setMaterialOpacity(material) {
    material.opacity = this.opacity * material.userData.originalOpacity;
    const currentTransparent = material.transparent;
    material.transparent = material.opacity < 1.0;
    material.needsUpdate = currentTransparent !== material.transparent;
  }
  onColorMapUpdated() {
    this.traversePointCloudMaterials(m => m.updateUniforms());
  }
  get errorTarget() {
    return this._tiles.errorTarget;
  }
  set errorTarget(v) {
    if (this._tiles.errorTarget !== v) {
      this._tiles.errorTarget = v;
      this.notifyChange(this);
    }
  }

  /**
   * Gets or sets the size of points. Only applies to point cloud tiles.
   */
  get pointSize() {
    return this._pointCloudParameters.pointSize;
  }
  set pointSize(v) {
    if (this._pointCloudParameters.pointSize !== v) {
      this._pointCloudParameters.pointSize = v;
      this.traversePointCloudMaterials(m => {
        m.size = v;
      });
      this.notifyChange(this);
    }
  }

  /**
   * Gets or sets display mode of point clouds. Only applies to point cloud tiles.
   */
  get pointCloudMode() {
    return this._pointCloudParameters.pointCloudMode;
  }
  set pointCloudMode(v) {
    if (this._pointCloudParameters.pointCloudMode !== v) {
      this._pointCloudParameters.pointCloudMode = v;
      this.traversePointCloudMaterials(m => m.mode = v);
      this.notifyChange(this);
    }
  }

  /**
   * Gets or sets the default color of point clouds. Only applies to point cloud tiles.
   */
  get pointCloudColor() {
    return this._pointCloudParameters.overlayColor;
  }
  set pointCloudColor(v) {
    const color = v != null ? new Color(v) : new Color();
    if (v == null || this._pointCloudParameters.overlayColor == null || !this._pointCloudParameters.overlayColor.equals(color)) {
      this._pointCloudParameters.overlayColor = color;
      this.notifyChange(this);
    }
  }

  /**
   * Gets or sets the point cloud brightness, contrast and saturation. Only applies to point cloud tiles.
   */
  get pointCloudColorimetryOptions() {
    return this._pointCloudParameters.colorimetry;
  }
  set pointCloudColorimetryOptions(v) {
    if (this._pointCloudParameters.colorimetry !== v) {
      this._pointCloudParameters.colorimetry = v;
      this.traversePointCloudMaterials(m => {
        m.brightness = v.brightness;
        m.contrast = v.contrast;
        m.saturation = v.saturation;
      });
      this.notifyChange(this);
    }
  }

  /**
   * Gets the classifications for point clouds. Only applies to point cloud tiles.
   */
  get pointCloudClassifications() {
    return this._pointCloudParameters.classifications;
  }

  /**
   * Gets the colormap used for point clouds. Only applies to point cloud tiles.
   */
  get colorMap() {
    return this._pointCloudParameters.pointCloudColorMap;
  }
  traversePointCloudMaterials(callback) {
    this.traverseMaterials(m => {
      if (PointCloudMaterial.isPointCloudMaterial(m)) {
        callback(m);
      }
    });
  }
  setDebugParam(key, value) {
    // This plugin has a severe performance cost until it can be disabled at runtime
    // See https://github.com/NASA-AMMOS/3DTilesRendererJS/issues/647
    let plugin = this._tiles.getPluginByName('DEBUG_TILES_PLUGIN');
    if (plugin == null) {
      plugin = new DebugTilesPlugin();
      this._tiles.registerPlugin(plugin);
    }
    if (plugin != null && plugin[key] !== value) {
      plugin[key] = value;
      this.notifyChange(this);
    }
    this.updateDebugPluginState();
  }
  updateDebugPluginState() {
    this._debugPlugin.enabled = this._debugOptions.displayBoxBounds || this._debugOptions.displayRegionBounds || this._debugOptions.displaySphereBounds;
  }

  /**
   * Toggles the display of box volumes.
   */
  get displayBoxBounds() {
    return this._debugOptions.displayBoxBounds;
  }
  set displayBoxBounds(v) {
    if (this._debugOptions.displayBoxBounds !== v) {
      this._debugOptions.displayBoxBounds = v;
      this.setDebugParam('displayBoxBounds', v);
    }
  }

  /**
   * Toggles the display of sphere volumes.
   */
  get displaySphereBounds() {
    return this._debugOptions.displaySphereBounds;
  }
  set displaySphereBounds(v) {
    if (this._debugOptions.displaySphereBounds !== v) {
      this._debugOptions.displaySphereBounds = v;
      this.setDebugParam('displaySphereBounds', v);
    }
  }

  /**
   * Toggles the display of region volumes.
   */
  get displayRegionBounds() {
    return this._debugOptions.displayRegionBounds;
  }
  set displayRegionBounds(v) {
    if (this._debugOptions.displayRegionBounds !== v) {
      this._debugOptions.displayRegionBounds = v;
      this.setDebugParam('displayRegionBounds', v);
    }
  }

  /**
   * Prepares the object so that it can receive a color layer.
   */
  prepareLayerNode(node) {
    if (node.visible && node.userData.extent == null) {
      const localBox = node.userData.boundingBox;
      const worldBox = localBox.clone().applyMatrix4(node.matrixWorld);
      const extent = Extent.fromBox3(this.instance.coordinateSystem, worldBox);
      node.userData.extent = extent;
    }
  }
  onTileDisposed(e) {
    const {
      scene
    } = e;
    if (this.layerCount !== 0 && isLayerNode(scene)) {
      this.forEachLayer(layer => layer.unregisterNode(scene));
    }
    this.notifyChange(this);
  }
  onTileVisibilityChanged(e) {
    const {
      scene,
      visible
    } = e;
    if (this.layerCount !== 0 && isLayerNode(scene)) {
      if (visible && scene.userData.extent == null) {
        this.prepareLayerNode(scene);
      }

      // We have to unregister the node when the tile becomes invisible
      // because currently, the library does not delete invisible tiles
      // See https://github.com/NASA-AMMOS/3DTilesRendererJS/pull/874
      // for a future plugin that will actually unload the tiles.
      if (!visible) {
        this.forEachLayer(layer => layer.unregisterNode(scene));
      }
      scene.dispatchEvent({
        type: 'visibility-changed'
      });
    }
    if (visible) {
      this.updateMaterial(scene);
    }
    this.notifyChange(this);
  }
  updateMaterial(scene) {
    this.traverseMaterials(m => this.setupMaterial(m), scene);
    if (isPNTSScene(scene)) {
      this._pointCloudPlugin.updateMaterial(scene.material);
    }
  }
  updateObject(obj) {
    const opts = this._objectOptions;

    // Note that for object to actually cast/receive shadows, they *must*
    // have a normal attribute set. This is not really documented anywhere
    // in the three.js documentation. "flat shading" is not sufficient,
    // as normals from flat shading are computed directly in the shader,
    // which is ignored by the actual shader used for shadows.
    obj.castShadow = opts.castShadow;
    obj.receiveShadow = opts.receiveShadow;
  }
  onModelLoaded(e) {
    if (typeof e === 'object' && e != null && 'scene' in e && isObject3D(e.scene)) {
      this.onObjectCreated(e.scene);
      e.scene.traverse(o => this.updateObject(o));
      this.updateMaterial(e.scene);
      this.notifyChange(this);
    }
  }
  setupMaterial(material) {
    material.clippingPlanes = this.clippingPlanes;
    // this object can already be transparent with opacity < 1.0
    // we need to honor it, even when we change the whole entity's opacity
    if (material.userData.originalOpacity == null) {
      material.userData.originalOpacity = material.opacity;
    }
    this.setMaterialOpacity(material);
  }
  updateCameraDistances(context, obj) {
    const plane = context.distance.plane;
    if (obj.visible && 'geometry' in obj && isBufferGeometry(obj.geometry)) {
      const geometry = obj.geometry;
      if (geometry.boundingBox == null) {
        geometry.computeBoundingBox();
      }

      // Note: this algorithm is exactly the same as the one used by the map
      // TODO We might want to extract it and commonalize.
      // https://gitlab.com/giro3d/giro3d/-/issues/540
      const bbox = tmpBox3.copy(nonNull(geometry.boundingBox)).applyMatrix4(obj.matrixWorld);
      const distance = plane.distanceToPoint(bbox.getCenter(tmpVector));
      const radius = bbox.getSize(tmpVector).length() * 0.5;
      this._distance.min = Math.min(this._distance.min, distance - radius);
      this._distance.max = Math.max(this._distance.max, distance + radius);
    }
  }
  dispose() {
    this._tiles.removeEventListener('load-model', this._listeners.onModelLoaded);
    this._tiles.removeEventListener('tile-visibility-change', this._listeners.onTileVisibilityChanged);
    this._tiles.removeEventListener('dispose-model', this._listeners.onTileDisposed);
    this._pointCloudParameters.pointCloudColorMap.removeEventListener('updated', this._listeners.onColorMapUpdated);
    this._tiles.dispose();
  }
}