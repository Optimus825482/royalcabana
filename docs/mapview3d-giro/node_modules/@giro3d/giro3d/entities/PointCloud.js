/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */

import { Box3Helper, BufferGeometry, Color, Group, MathUtils, Sphere, Vector2, Vector3 } from 'three';
import { defaultColorimetryOptions } from '../core/ColorimetryOptions';
import ColorMap from '../core/ColorMap';
import Extent from '../core/geographic/Extent';
import { getGeometryMemoryUsage } from '../core/MemoryUsage';
import pickPointsAt from '../core/picking/PickPointsAt';
import { DefaultQueue } from '../core/RequestQueue';
import PointCloudMaterial, { ASPRS_CLASSIFICATIONS, MODE } from '../renderer/PointCloudMaterial';
import { ClassificationSlot } from '../renderer/pointcloudmaterial/slots/ClassificationSlot';
import { ColorSlot } from '../renderer/pointcloudmaterial/slots/ColorSlot';
import { ScalarSlot } from '../renderer/pointcloudmaterial/slots/ScalarSlot';
import { traverseNode } from '../sources/PointCloudSource';
import { isOrthographicCamera, isPerspectiveCamera } from '../utils/predicates';
import { AbortError } from '../utils/PromiseUtils';
import StateMachine from '../utils/StateMachine';
import { nonNull } from '../utils/tsutils';
import Entity3D from './Entity3D';
import { PointCloudMesh } from './pointcloud/PointCloudMesh';

/**
 * - empty: no mesh data yet. Initial state.
 * - hidden: mesh data present, but not visible.
 * - loading: either mesh data is absent or present but obsolete, and new data is currently loading.
 * - displayed: mesh data up to date and displayed.
 */

const DEFAULT_CLEANUP_DELAY = 5000;
const TEXTURE_SIZE = new Vector2(256, 256);
const tmpVector3 = new Vector3();
const DEFAULT_COLORMAP = new ColorMap({
  colors: [new Color('black'), new Color('white')],
  min: 0,
  max: 1000
});
const DATA_VOLUME_HELPER_COLOR = new Color('#d8eb34');
const STATE_COLORS = {
  empty: new Color('grey'),
  hidden: new Color('#fc4903'),
  loading: new Color('#f5da8c'),
  displayed: new Color('#8cf59b')
};

/** Additional book-keeping info for each point cloud node. */

const nothing = () => {};
function createBoxHelper(box, color) {
  const helper = new Box3Helper(box, color);

  // To make it clearly visible
  helper.renderOrder = 999;

  // We don't want to raycast the helpers
  helper.raycast = nothing;
  return helper;
}

/***
 * Creates a box helper for the geometry bounding box of the node.
 */
function createTightVolumeHelper(info) {
  const mesh = nonNull(info.mesh);
  const localBoundingBox = nonNull(mesh.geometry.boundingBox);
  const helper = createBoxHelper(localBoundingBox, DATA_VOLUME_HELPER_COLOR);
  helper.name = `volume`;
  mesh.add(helper);
  helper.updateMatrixWorld(true);
  return helper;
}

/**
 * Creates a box helper for the volume of the node.
 */
function createVolumeHelper(info) {
  const node = info.node;
  const box = createBoxHelper(node.volume, STATE_COLORS[info.state]);
  box.name = info.node.id;
  return box;
}
function emptyNodeInfo(node) {
  return {
    id: node.id,
    node,
    state: 'empty',
    stateTimestamp: performance.now(),
    shouldBeVisible: false,
    positionDirty: true
  };
}
const cachedMaterials = [];
export class UnsupportedAttributeError extends Error {
  constructor(attribute) {
    super(`attribute '${attribute}' is not supported in this source`);
  }
}
function computeScreenSpaceError(node, pointSize, preSSE, distance) {
  if (distance <= 0) {
    return Infinity;
  }
  // Estimate the onscreen distance between 2 points
  const onScreenSpacing = preSSE * node.geometricError / distance;

  // [  P1  ]--------------[   P2   ]
  //     <--------------------->      = pointsSpacing (in world coordinates)
  //                                  ~ onScreenSpacing (in pixels)
  // <------>                         = layer.pointSize (in pixels)
  // we are interested in the radius of the points, not their total size.

  return Math.max(0.0, onScreenSpacing - pointSize / 2);
}

/**
 * Constructor options for the {@link PointCloud} entity.
 */

/**
 * Displays point clouds coming from a {@link PointCloudSource}.
 *
 * This entity supports two coloring modes: `'attribute'` and `'layer'`. In coloring mode `'attribute'`,
 * points are colorized from the selected attributes (e.g color, intensity, classification...).
 *
 * ```ts
 * pointCloud.setColoringMode('attribute');
 * pointCloud.setActiveAttribute('Intensity');
 * ```
 *
 * In coloring mode `'layer'`, points are colorized using a {@link ColorLayer} that must be set with
 * {@link setColorLayer}.
 *
 * Note: the layer does not have to be in the same coordinate system as the point cloud.
 *
 * ```ts
 * const colorLayer = new ColorLayer(...);
 * pointCloud.setColorLayer(colorLayer);
 * pointCloud.setColoringMode('layer');
 * ```
 */
export default class PointCloud extends Entity3D {
  /** Readonly flag to indicate that this object is a PointCloud instance. */
  isPointCloud = true;
  type = 'PointCloud';
  hasLayers = true;
  _tileVolumeRoot = new Group();
  _pointsRoot = new Group();
  _classificationsPerAttribute = new Map();
  _colorMapPerAttribute = new Map();

  /** The source of this entity. */

  intersectingVolumes = [];
  _colorLayer = null;
  _depthTest = true;
  _subdivisionThreshold = 1;
  _shaderMode = MODE.ELEVATION;
  _activeAttributes = [];
  _pointSize = 0;
  _cleanupDelay = DEFAULT_CLEANUP_DELAY;
  _showVolume = false;
  _decimation = 1;
  _showPoints = true;
  _showNodeDataVolumes = false;
  _disposed = false;
  _pointBudget = null;
  _elevationColorMap = DEFAULT_COLORMAP.clone();
  _colorimetry = defaultColorimetryOptions();

  // Available after initialization
  _rootNode = null;
  _metadata = null;
  _volumeHelper = null;
  constructor(options) {
    super(options);
    this.source = options.source;
    this.object3d.add(this._pointsRoot);
    this.object3d.add(this._tileVolumeRoot);
    this._pointsRoot.name = 'meshes';
    this._tileVolumeRoot.name = 'tile volumes';
    this._tileVolumeRoot.visible = false;
    this._cleanupDelay = options.cleanupDelay ?? this._cleanupDelay;

    // Note that this interval is just a polling interval.
    // It is independent from the cleanup delay which is counted for each node individually.
    this._cleanupPollingInterval = setInterval(() => this.cleanup(), 1000);
    this._listeners = {
      clear: this.clear.bind(this),
      updateColorMap: this.updateUniforms.bind(this)
    };
    this.source.addEventListener('updated', this._listeners.clear);
    this._elevationColorMap.addEventListener('updated', this._listeners.updateColorMap);

    // We use a state machine to represent the transitions between various
    // point cloud node states, as well as the logic to trigger for each transition.
    this._stateMachine = new StateMachine({
      legalTransitions: [
      // The node just became visible and we started loading its data.
      ['empty', 'loading'],
      // The node was hidden before it could finish loading.
      ['loading', 'empty'],
      // The node is displayed after it finished loading.
      ['loading', 'displayed'],
      // The node becomes invisible, but we don't destroy its data yet, to
      // allow for it to be displayed quickly if it becomes visible again.
      ['displayed', 'hidden'],
      // The node has obsolete data (i.e the active attribute has changed).
      ['displayed', 'loading'],
      // The node just became visible and its data is still up to date.
      ['hidden', 'displayed'],
      // The node is hidden with obsolete data, so we have to load it again.
      ['hidden', 'loading'],
      // The node is destroyed after its expiration delay is reached.
      ['hidden', 'empty']]
    });
    const onStateChanged = info => {
      // Track the timestamp of the state change,
      // so we can measure the expiration delay before
      // we are allowed to cleanup mesh data.
      info.stateTimestamp = performance.now();
      this.notifyChange();
    };
    this._stateMachine.addPostTransitionCallback('hidden', ({
      value
    }) => {
      // If the node was being loaded, let's abort the loading
      value.controller?.abort('aborted');
      value.controller = undefined;
      if (value.mesh) {
        value.mesh.visible = false;
      }
      onStateChanged(value);
    });
    this._stateMachine.addPostTransitionCallback('displayed', ({
      value
    }) => {
      // If the node was being loaded, let's abort the loading
      value.controller?.abort('aborted');
      value.controller = undefined;
      if (value.mesh) {
        value.mesh.visible = true;
        this.updateMaterial(value.mesh);
      }
      value.controller = undefined;
      onStateChanged(value);
    });
    this._stateMachine.addPostTransitionCallback('empty', ({
      value
    }) => {
      // If the node was being loaded, let's abort the loading
      value.controller?.abort('aborted');
      value.controller = undefined;

      // If the node had a mesh, let's destroy it
      if (value.mesh) {
        this.disposeMesh(value.mesh);
        value.mesh = undefined;
      }
      this.removeDataVolumeHelper(value);
      this.removeVolumeHelper(value);
      onStateChanged(value);
    });
    this._stateMachine.addPostTransitionCallback('loading', ({
      value
    }) => {
      // If the node was being loaded, let's abort the loading
      value.controller?.abort('aborted');
      value.controller = undefined;
      if (value.node.hasData) {
        // Create a new abort controller that will control the cancellation
        // of the loading, in case the state changes before the loading is finished.
        value.controller = new AbortController();
        const signal = value.controller.signal;
        const activeAttributes = this._activeAttributes.map(activeAttribute => ({
          ...activeAttribute
        }));
        const priority = this.getNodeLoadingPriority(value);
        DefaultQueue.enqueue({
          id: MathUtils.generateUUID(),
          priority,
          signal,
          shouldExecute: () => value.state === 'loading',
          request: () => this.loadNodeData(value, signal, activeAttributes)
        }).catch(e => {
          if (!(e instanceof AbortError)) {
            console.error(e);
          } // Do nothing
        });
      }
      onStateChanged(value);
    });
  }
  getNodeLoadingPriority(nodeInfo) {
    // We want to load big, low resolution nodes first, since point clouds are additive.
    return nodeInfo.node.depth;
  }

  /**
   * Enables or disables depth testing for point cloud meshes.
   *
   * @defaultValue true
   */
  get depthTest() {
    return this._depthTest;
  }
  set depthTest(v) {
    if (this._depthTest !== v) {
      this._depthTest = v;
      this.traversePointCloudMaterials(m => m.depthTest = v);
      this.notifyChange(this);
    }
  }
  get progress() {
    return this.source.progress;
  }
  get loading() {
    return this.source.loading;
  }
  get layerCount() {
    return this._colorLayer != null ? 1 : 0;
  }
  updateMaterials() {
    this.forEachNodeInfo(info => {
      if (info.mesh != null) {
        this.updateMaterial(info.mesh);
      }
    });
  }

  /**
   * Gets or sets the brightness of this point cloud.
   */
  get brightness() {
    return this._colorimetry.brightness;
  }
  set brightness(v) {
    if (this._colorimetry.brightness !== v) {
      this._colorimetry.brightness = v;
      this.updateMaterials();
      this.notifyChange(this);
    }
  }

  /**
   * Gets or sets the contrast of this point cloud.
   */
  get contrast() {
    return this._colorimetry.contrast;
  }
  set contrast(v) {
    if (this._colorimetry.contrast !== v) {
      this._colorimetry.contrast = v;
      this.updateMaterials();
      this.notifyChange(this);
    }
  }

  /**
   * Gets or sets the saturation of this point cloud.
   */
  get saturation() {
    return this._colorimetry.saturation;
  }
  set saturation(v) {
    if (this._colorimetry.saturation !== v) {
      this._colorimetry.saturation = v;
      this.updateMaterials();
      this.notifyChange(this);
    }
  }

  /**
   * The colormap used to colorize cloud by elevation.
   */
  get elevationColorMap() {
    return this._elevationColorMap;
  }
  set elevationColorMap(c) {
    if (this._elevationColorMap !== c) {
      this._elevationColorMap.removeEventListener('updated', this._listeners.updateColorMap);
      this._elevationColorMap = c ?? DEFAULT_COLORMAP;
      this._elevationColorMap.addEventListener('updated', this._listeners.updateColorMap);
      this.updateUniforms();
      this.notifyChange(this);
    }
  }

  /**
   * Gets the colormap used for coloring an attribute.
   * @param attributeName - The name of the attribute
   */
  getAttributeColorMap(attributeName) {
    let colorMap = this._colorMapPerAttribute.get(attributeName);
    if (colorMap == null) {
      colorMap = DEFAULT_COLORMAP.clone();
      colorMap.addEventListener('updated', this._listeners.updateColorMap);
      this._colorMapPerAttribute.set(attributeName, colorMap);
    }
    return colorMap;
  }

  /**
   * Sets the colormap used for coloring an attribute.
   * @param attributeName - The name of the attribute
   * @param colorMap - The colormap to use
   */
  setAttributeColorMap(attributeName, colorMap) {
    const previousColorMap = this._colorMapPerAttribute.get(attributeName);
    if (previousColorMap != null) {
      previousColorMap.removeEventListener('updated', this._listeners.updateColorMap);
    }
    const newColorMap = colorMap ?? DEFAULT_COLORMAP.clone();
    newColorMap.addEventListener('updated', this._listeners.updateColorMap);
    this._colorMapPerAttribute.set(attributeName, newColorMap);
    this._listeners.updateColorMap();
  }
  updateUniforms() {
    this.forEachNodeInfo(info => {
      // We don't want to immediately update the colormap for nodes that are
      // not completely loaded to avoid inconsistent situations where the node
      // currently has an attribute that does not match the colormap (since the new
      // attribute, that might match the colormap, is not loaded yet).
      // This would cause a flickering that we want to avoid.
      // For example: the current attribute is "intensity", and the colormap is tuned
      // to this attribute. The user switches to attribute "Z", and changes the colormap
      // to reflect this attribute. However, the data is asynchronously loading for the new
      // attribute, so nodes would have the colormap for "Z" while _still_ displaying point
      // data for "intensity".
      // Only when the node is completely loaded that we update the material's colormap.
      if (info.state === 'displayed' && info.mesh != null) {
        this.updateMaterial(info.mesh);
      }
    });
  }

  /**
   * The global factor that drives LOD computation. The lower this value, the
   * sooner a node is subdivided. Note: changing this scale to a value less than 1 can drastically
   * increase the number of nodes displayed in the scene, and can even lead to browser crashes.
   *
   * @defaultValue 1
   */
  get subdivisionThreshold() {
    return this._subdivisionThreshold;
  }
  set subdivisionThreshold(v) {
    if (v !== this._subdivisionThreshold) {
      this._subdivisionThreshold = v;
      this.instance.notifyChange(this);
    }
  }

  /**
   * Returns the list of supported attributes in the source.
   */
  getSupportedAttributes() {
    return nonNull(this._metadata?.attributes, 'the entity is not yet ready');
  }

  /**
   * The point size, in pixels.
   *
   * Note: a value of zero triggers automatic size computation.
   *
   * @defaultValue 0
   */
  get pointSize() {
    return this._pointSize;
  }
  set pointSize(size) {
    if (this._pointSize !== size) {
      this._pointSize = size;
      this.traversePointCloudMaterials(m => m.size = size);
      this.notifyChange();
    }
  }

  /**
   * Gets the active attributes.
   *
   * Note: to set the active attributes, use {@link setActiveAttribute} or {@link setActiveAttributes}.
   */
  getActiveAttributes() {
    return this._activeAttributes;
  }

  /**
   * Sets the coloring mode of the entity:
   * - `layer`: the point cloud is colorized from a color layer previously set with {@link setColorLayer}.
   * - `attribute`: the point cloud is colorized from the source attributes (e.g color, classification...)
   * previously set with {@link setActiveAttribute}.
   */
  setColoringMode(mode) {
    if (mode === 'layer') {
      this._shaderMode = MODE.TEXTURE;
      this.notifyChange(this);
    } else {
      this._shaderMode = MODE.ELEVATION;
      this.updateColoringFromAttribute(true);
    }
    this.traversePointCloudMaterials(m => m.mode = this._shaderMode);
  }
  updateColoringFromAttribute(needsReload) {
    if (this._activeAttributes.length > 0) {
      this._shaderMode = MODE.ATTRIBUTES;
    }
    if (needsReload) {
      // Let's reload the relevant nodes.
      this.forEachNodeInfo(info => {
        switch (info.state) {
          case 'displayed':
          case 'loading':
            // We must reload the node's data, but only the attribute part.
            // No need to reload the position data has it will not change
            // inbetween attributes.
            info.positionDirty = false;
            // Note that we allow transitioning from 'loading' to 'loading', as
            // the two states do not match the same attribute, so they are not
            // strictly identical.
            this._stateMachine.transition(info, 'loading', {
              allowSelfTransition: true
            });
            break;
          case 'hidden':
            // Since the data is obsolete, we might as well destroy it right now,
            // instead of waiting for the expiration delay.
            this._stateMachine.transition(info, 'empty');
            break;
        }
      });
    }
    this.updateUniforms();
    this.notifyChange(this);
  }

  /**
   * Sets the active attribute.
   *
   * Note: to enable coloring from the attribute, use {@link setColoringMode} with mode `'attribute'`.
   *
   * Note: To get the supported attributes, use {@link getSupportedAttributes}.
   *
   * @param attributeName - The active attribute.
   *
   * @throws {@link UnsupportedAttributeError} If the attribute is not supported by the source.
   */
  setActiveAttribute(attributeName) {
    this.setActiveAttributes([{
      name: attributeName,
      weight: 1
    }]);
  }

  /**
   * Sets the active attributes.
   *
   * Note: to enable coloring from the attributes, use {@link setColoringMode} with mode `'attribute'`.
   *
   * Note: To get the supported attributes, use {@link getSupportedAttributes}.
   *
   * @param attributes - List of attributes to set activate, with their respective weights. There cannot be more than 3;
   *
   * @throws {@link UnsupportedAttributeError} If the attribute is not supported by the source.
   */

  setActiveAttributes(attributes) {
    if (attributes.length > 3) {
      throw new Error(`A point cloud cannot have more than 3 active attributes (${attributes.length} were requested).`);
    }

    // ignore attributes that were requested with an invalid weight
    attributes = attributes.filter(att => att.weight > 0);

    // deactivate attributes that are requested to be removed
    this._activeAttributes = this._activeAttributes.filter(activeAttribute => {
      return attributes.find(att => att.name === activeAttribute.attribute.name) != null;
    });
    const availableMaterialSlots = {
      color: new Set([0, 1, 2]),
      classification: new Set([0, 1, 2]),
      unknown: new Set([0, 1, 2])
    };
    for (const activeAttribute of this._activeAttributes) {
      const slotType = activeAttribute.attribute.interpretation;
      availableMaterialSlots[slotType].delete(activeAttribute.geometrySlot);
    }
    const supportedAttributes = this.getSupportedAttributes();
    let needsReload = false;
    for (const attribute of attributes) {
      let activeAttribute = this._activeAttributes.find(att => att.attribute.name === attribute.name);
      if (activeAttribute) {
        activeAttribute.weight = attribute.weight;
      } else {
        const supportedAttribute = supportedAttributes.find(att => att.name === attribute.name);
        if (!supportedAttribute) {
          throw new UnsupportedAttributeError(attribute.name);
        }
        const slotType = supportedAttribute.interpretation;
        const nextSlotAvailable = Array.from(availableMaterialSlots[slotType]).shift();
        if (typeof nextSlotAvailable === 'undefined') {
          throw new Error(`Could not find an available slot for a newattribute of type "${slotType}".`);
        }
        availableMaterialSlots[slotType].delete(nextSlotAvailable);
        activeAttribute = {
          attribute: supportedAttribute,
          weight: attribute.weight,
          geometrySlot: nextSlotAvailable
        };
        this._activeAttributes.push(activeAttribute);
        needsReload = true;
      }
    }
    if (this._shaderMode !== MODE.TEXTURE) {
      this.updateColoringFromAttribute(needsReload);
    }
  }

  /**
   * Toggles the visibility of the point cloud volume.
   */
  get showVolume() {
    return this._showVolume;
  }
  set showVolume(show) {
    if (this._showVolume !== show) {
      this._showVolume = show;
      if (this.ready) {
        if (show) {
          if (!this._volumeHelper) {
            this.createGlobalVolumeHelper();
          }
        } else {
          if (this._volumeHelper != null) {
            this._volumeHelper.geometry.dispose();
            this._volumeHelper.material.dispose();
            this._volumeHelper.removeFromParent();
            this._volumeHelper = null;
          }
        }
        this.notifyChange();
      }
    }
  }

  /**
   * The amount of decimation to apply to currently displayed point meshes. A value of `1` means
   * that all points are displayed. A value of `N` means that we display only 1 every Nth point.
   *
   * Note: this has no effect on the quantity of data that point cloud sources must fetch, as it
   * is a purely graphical setting. This does, however, improve rendering performance by reducing
   * the number of points to draw on the screen.
   */
  get decimation() {
    return this._decimation;
  }
  set decimation(v) {
    if (this._decimation !== v) {
      this._decimation = v;
      this.notifyChange(this);
    }
  }

  /**
   * The delay, in milliseconds, to remove unused data for each node.
   * Must be a positive integer greater or equal to zero.
   *
   * Setting it to zero will cleanup immediately after a node becomes invisible.
   */
  get cleanupDelay() {
    return this._cleanupDelay;
  }
  set cleanupDelay(delay) {
    if (delay < 0) {
      throw new Error('expected a positive integer, got: ' + delay);
    }
    this._cleanupDelay = Math.round(delay);
  }

  /**
   * Enables or disables the display of the point cloud.
   * @defaultValue true
   */
  get showPoints() {
    return this._showPoints;
  }
  set showPoints(v) {
    if (this._showPoints !== v) {
      this._showPoints = v;
      this.traversePointCloudMaterials(m => m.visible = v);
      this.notifyChange();
    }
  }

  /**
   * Toggles the visibility of invidividual node volumes.
   */
  get showNodeVolumes() {
    return this._tileVolumeRoot.visible;
  }
  set showNodeVolumes(show) {
    this._tileVolumeRoot.visible = show;
    if (!show) {
      this.forEachNodeInfo(info => {
        if (info.volumeHelper != null) {
          info.volumeHelper.removeFromParent();
          info.volumeHelper.geometry.dispose();
          info.volumeHelper.material.dispose();
          info.volumeHelper = undefined;
        }
      });
    }
    this.notifyChange(this);
  }

  /**
   * Toggles the visibility of individual node content volumes.
   *
   * Note: octree-based point clouds have cube-shaped node volumes, whereas
   * their  node data volume is a tight bounding box around the actual points of the node.
   */
  get showNodeDataVolumes() {
    return this._showNodeDataVolumes;
  }
  set showNodeDataVolumes(show) {
    if (this._showNodeDataVolumes !== show) {
      this._showNodeDataVolumes = show;
      if (!show) {
        this.forEachNodeInfo(info => this.removeDataVolumeHelper(info));
      }
      this.notifyChange(this);
    }
  }

  /**
   * Gets the classification array. The array contains 256 entries that can be updated,
   * but the array itself may not be resized.
   *
   * @param attributeName - Name of the attribute
   * @defaultValue `ASPRS_CLASSIFICATIONS`
   */
  getAttributeClassifications(attributeName) {
    return this.getOrCreateAttributeClassifications(attributeName);
  }

  /**
   * Gets the total number of points in this point cloud, or `undefined`
   * if this value is not known.
   *
   * Note: the entity must be initialized to be able to access this property.
   */
  get pointCount() {
    return nonNull(this._metadata, 'not initialized').pointCount;
  }

  /**
   * Gets the number of points currently displayed.
   */
  get displayedPointCount() {
    let sum = 0;
    this.traversePointCloudMeshes(m => {
      if (m.visible && m.material.visible) {
        sum += m.geometry.getAttribute('position').count;
      }
    });
    return Math.floor(sum / this.decimation);
  }

  /**
   * Gets or sets the point budget. A non-null point budget will automatically compute the
   * {@link decimation} property every frame, based on the number of currently displayed points.
   * A value of `null` removes the point budget and stop automatic decimation computation.
   */
  get pointBudget() {
    return this._pointBudget;
  }
  set pointBudget(v) {
    if (this._pointBudget !== v) {
      this._pointBudget = v;
      if (v == null) {
        this.decimation = 1;
      }
      this.notifyChange(this);
    }
  }
  getMemoryUsage(context) {
    this.traversePointCloudMeshes(m => getGeometryMemoryUsage(context, m.geometry));
    this.forEachLayer(layer => {
      layer.getMemoryUsage(context);
    });
    this.source.getMemoryUsage(context);
  }
  updateOpacity() {
    // We don't want to change the opacity of volume helpers
    this.traversePointCloudMaterials(m => {
      m.opacity = this.opacity;
      m.transparent = this.opacity < 1;
    });
  }

  /**
   * Forces the point cloud to reload all data.
   */
  clear() {
    this.forEachNodeInfo(info => {
      if (info.state === 'loading' || info.state === 'displayed') {
        // we have to reload the position here, since the number of points per node might
        // have changed (happens when we set new filters for example).
        info.positionDirty = true;
        this._stateMachine.transition(info, 'loading', {
          allowSelfTransition: true
        });
      } else {
        // Invalidate non-visible nodes
        this._stateMachine.transition(info, 'empty');
      }
    });
    this.notifyChange(this);
  }
  getBoundingBox() {
    return this._metadata?.volume ?? this._rootNode?.volume ?? null;
  }
  async preprocess() {
    await this.source.initialize();
    this._rootNode = await this.source.getHierarchy();
    this._metadata = await this.source.getMetadata();
    for (const attribute of this._metadata.attributes) {
      if (attribute.interpretation === 'unknown') {
        if (!this._colorMapPerAttribute.has(attribute.name)) {
          this._colorMapPerAttribute.set(attribute.name, DEFAULT_COLORMAP.clone());
        }
      } else if (attribute.interpretation === 'classification') {
        this.getOrCreateAttributeClassifications(attribute.name);
      }
    }

    // Default to displaying the first attribute in the list
    this.setActiveAttribute(this._metadata.attributes[0].name);
    if (this.showVolume) {
      this.createGlobalVolumeHelper();
    }
  }
  deleteNodeHierarchy(root) {
    // Delete this node and its descendants
    traverseNode(root, subNode => {
      const subInfo = this.getNodeInfo(subNode);
      switch (subInfo.state) {
        case 'displayed':
          // The mesh is not destroyed right away, but simply hidden for now.
          this._stateMachine.transition(subInfo, 'hidden');
          break;
        case 'loading':
          this._stateMachine.transition(subInfo, 'empty');
          break;
      }
      return true;
    });
  }
  preUpdate(context) {
    if (!this.visible || this.frozen || !this._rootNode) {
      return null;
    }
    const view = context.view;
    const camera = view.camera;
    let preSSE;
    if (isPerspectiveCamera(camera)) {
      // See https://cesiumjs.org/hosted-apps/massiveworlds/downloads/Ring/WorldScaleTerrainRendering.pptx
      // slide 17
      preSSE = view.height / (2 * Math.tan(MathUtils.degToRad(camera.fov) * 0.5));
    } else if (isOrthographicCamera(camera)) {
      preSSE = view.height * camera.near / (camera.top - camera.bottom);
    }
    traverseNode(this._rootNode, node => {
      const nodeVisible = view.isBox3Visible(node.volume, this.object3d.matrixWorld);
      const contentVisible = nodeVisible && this.testNodeSSE(view, node, preSSE);
      const info = this.getNodeInfo(node);
      info.shouldBeVisible = contentVisible;
      if (contentVisible) {
        this.showNode(node);
        this.updateMinMaxDistance(context, node);
      } else {
        // Delete this node and its descendants
        this.deleteNodeHierarchy(node);
      }

      // Don't traverse further if the node is frustum culled or if its LOD is enough.
      return contentVisible;
    });
    return null;
  }
  updateDecimation(totalPointCount, materials) {
    // Automatically compute decimation based on point budget
    // Otherwise, use the decimation value.
    if (this._pointBudget != null) {
      if (totalPointCount > this._pointBudget) {
        this.decimation = MathUtils.clamp(Math.floor(totalPointCount / this._pointBudget), 1, +Infinity);
      } else {
        this.decimation = 1;
      }
    }
    for (let i = 0; i < materials.length; i++) {
      materials[i].decimation = this.decimation;
    }
  }
  postUpdate(context) {
    if (!this.visible || this.frozen) {
      return;
    }
    if (this.showNodeVolumes || this.showNodeDataVolumes) {
      this.updateHelpers();
    }
    cachedMaterials.length = 0;
    let totalPointCount = 0;
    this.traversePointCloudMeshes(node => {
      if (node.visible && node.material.visible) {
        cachedMaterials.push(node.material);
        totalPointCount += node.geometry.getAttribute('position').count;
        if (this._shaderMode === MODE.TEXTURE) {
          this._colorLayer?.update(context, node);
        }
      }
    });
    this.updateDecimation(totalPointCount, cachedMaterials);
    if (this._shaderMode === MODE.TEXTURE) {
      this._colorLayer?.postUpdate();
    }
  }

  /**
   * Disposes this entity and deletes unmanaged graphical resources.
   */
  dispose() {
    if (this._disposed) {
      return;
    }
    this._disposed = true;
    clearInterval(this._cleanupPollingInterval);
    this.forEachNodeInfo(info => {
      this.removeDataVolumeHelper(info);
      this.removeVolumeHelper(info);
      if (info.mesh) {
        this.disposeMesh(info.mesh);
      }
    });
    this.object3d.clear();
    this.source.removeEventListener('updated', this._listeners.clear);
    this._elevationColorMap.removeEventListener('updated', this._listeners.updateColorMap);
    for (const colorMap of this._colorMapPerAttribute.values()) {
      colorMap.removeEventListener('updated', this._listeners.updateColorMap);
    }
    this.source.dispose();
  }
  pick(canvasCoords, options) {
    return pickPointsAt(this.instance, canvasCoords, this, options);
  }

  /**
   * Sets the color layer to colorize the points.
   *
   * Note: to enable coloring from the color layer, use {@link setColoringMode} with mode `'layer'`.
   *
   * @param colorLayer - The color layer.
   */
  setColorLayer(colorLayer) {
    if (this._colorLayer !== colorLayer) {
      this._colorLayer = colorLayer;
      this.notifyChange(this);
    }
  }
  removeColorLayer() {
    if (this._colorLayer) {
      this.traversePointCloudMeshes(m => this._colorLayer?.unregisterNode(m));
      this._colorLayer = null;
      this.notifyChange(this);
    }
  }
  forEachLayer(callback) {
    if (this._colorLayer) {
      callback(this._colorLayer);
    }
  }
  getLayers(predicate) {
    if (this._colorLayer) {
      if (!predicate || predicate(this._colorLayer)) {
        return [this._colorLayer];
      }
    }
    return [];
  }
  updateMinMaxDistance(context, node) {
    const bbox = node.volume;
    const distance = context.distance.plane.distanceToPoint(bbox.getCenter(tmpVector3));
    const radius = bbox.getSize(tmpVector3).length() * 0.5;
    this._distance.min = Math.min(this._distance.min, distance - radius);
    this._distance.max = Math.max(this._distance.max, distance + radius);
  }
  traversePointCloudMaterials(callback) {
    this.traverseMaterials(m => {
      if (PointCloudMaterial.isPointCloudMaterial(m)) {
        callback(m);
      }
    });
  }

  /**
   * Creates a volume helper for the entire entity.
   */
  createGlobalVolumeHelper() {
    const volume = nonNull(this._metadata).volume;
    if (volume) {
      this._volumeHelper = createBoxHelper(volume, new Color('cyan'));
      this._volumeHelper.name = 'volume';
      this._tileVolumeRoot.add(this._volumeHelper);
      this.object3d.add(this._volumeHelper);
      this._volumeHelper.updateMatrixWorld(true);
    }
  }
  getOrCreateAttributeClassifications(attributeName) {
    let classifications = this._classificationsPerAttribute.get(attributeName);
    if (classifications == null) {
      classifications = ASPRS_CLASSIFICATIONS.map(c => c.clone());
      this._classificationsPerAttribute.set(attributeName, classifications);
    }
    return classifications;
  }
  cleanup() {
    const now = performance.now();
    this.forEachNodeInfo(info => {
      this.cleanupNodeIfNecessary(info, now);
    });
  }
  testNodeSSE(view, node, preSSE) {
    if (node.depth <= 0) {
      return true;
    }
    const distance = view.camera.position.distanceTo(node.center);
    const sse = computeScreenSpaceError(node, this.pointSize, preSSE, distance);
    return sse > this.subdivisionThreshold;
  }
  updateGeometry(geometry, data, attributeNames) {
    if (data.position) {
      geometry.setAttribute('position', data.position);
    }
    for (let i = 0; i < data.attributes.length; i++) {
      const dataAttribute = data.attributes[i];
      const name = attributeNames[i];
      if (dataAttribute && dataAttribute.count > 0) {
        geometry.setAttribute(name, dataAttribute);
      }
    }
    return geometry;
  }
  createGeometry(data, attributeNames) {
    const geometry = new BufferGeometry();
    this.updateGeometry(geometry, data, attributeNames);
    return geometry;
  }
  createMaterial() {
    const result = new PointCloudMaterial({
      mode: this._shaderMode,
      size: this.pointSize
    });
    result.intersectingVolumes = this.intersectingVolumes;
    return result;
  }
  createMesh(data, attributeNames, volume) {
    const geometry = this.createGeometry(data, attributeNames);
    const mesh = new PointCloudMesh({
      geometry,
      extent: Extent.fromBox3(this.instance.coordinateSystem, volume),
      material: this.createMaterial(),
      textureSize: TEXTURE_SIZE
    });
    this.updateMaterial(mesh);

    // Sources can provide whatever origin position they want
    mesh.position.copy(data.origin);
    this._pointsRoot.add(mesh);

    // Some sources do not provide points at the correct scale.
    // Scaling the mesh is much cheaper than scaling each
    // individual point, so we do it here.
    if (data.scale != null) {
      mesh.scale.copy(data.scale);
    }
    mesh.updateMatrixWorld(true);

    // If the source provided us with a tight fitting bounding box,
    // let's use it. Otherwise we have to use the logical volume from
    // the hierarchy which is expected to be less tight.
    if (data.localBoundingBox) {
      geometry.boundingBox = data.localBoundingBox;
    } else {
      geometry.boundingBox = volume.clone().applyMatrix4(mesh.matrixWorld.clone().invert());
    }
    geometry.boundingSphere = geometry.boundingBox.getBoundingSphere(new Sphere());
    this.notifyChange(this);
    return mesh;
  }
  updateMaterial(mesh) {
    const material = mesh.material;
    material.setupFromGeometry(mesh.geometry);
    material.visible = this._showPoints;
    material.depthTest = this._depthTest;
    material.opacity = this.opacity;
    material.size = this._pointSize;
    material.mode = this._shaderMode;
    material.brightness = this._colorimetry.brightness;
    material.saturation = this._colorimetry.saturation;
    material.contrast = this._colorimetry.contrast;
    material.elevationColorMap = this.elevationColorMap;
    const colorsState = [{
      weight: 0
    }, {
      weight: 0
    }, {
      weight: 0
    }];
    const classificationsState = [{
      weight: 0
    }, {
      weight: 0
    }, {
      weight: 0
    }];
    const scalarsStates = [{
      weight: 0
    }, {
      weight: 0
    }, {
      weight: 0
    }];
    for (const activeAttribute of this._activeAttributes) {
      const interpretation = activeAttribute.attribute.interpretation;
      if (interpretation === 'unknown') {
        scalarsStates[activeAttribute.geometrySlot] = {
          weight: activeAttribute.weight,
          colorMap: this.getAttributeColorMap(activeAttribute.attribute.name)
        };
      } else if (interpretation === 'classification') {
        classificationsState[activeAttribute.geometrySlot] = {
          weight: activeAttribute.weight,
          classifications: this.getOrCreateAttributeClassifications(activeAttribute.attribute.name)
        };
      } else if (interpretation === 'color') {
        colorsState[activeAttribute.geometrySlot] = {
          weight: activeAttribute.weight
        };
      }
    }
    material.attributesState = {
      colors: colorsState,
      scalars: scalarsStates,
      classifications: classificationsState
    };
    material.updateUniforms();
  }
  cleanupNodeIfNecessary(info, now) {
    const delayExpired = now - info.stateTimestamp > this._cleanupDelay;
    if (info.state === 'hidden' && delayExpired) {
      this._stateMachine.transition(info, 'empty');
    }
  }
  disposeMesh(mesh) {
    mesh.removeFromParent();
    mesh.dispose();
  }
  traversePointCloudMeshes(callback) {
    this.traverse(obj => {
      if (PointCloudMesh.isPointCloud(obj)) {
        callback(obj);
      }
    });
  }

  /**
   * Loads data from the source for the given node.
   */
  async loadNodeData(info, signal, attributesAndSlots) {
    try {
      if (signal.aborted) {
        return;
      }
      const node = info.node;
      const attributes = attributesAndSlots.map(att => att.attribute);
      const attributeNames = attributesAndSlots.map(att => {
        if (att.attribute.interpretation === 'color') {
          return ColorSlot.getAttributeName(att.geometrySlot);
        } else if (att.attribute.interpretation === 'classification') {
          return ClassificationSlot.getAttributeName(att.geometrySlot);
        } else {
          return ScalarSlot.getAttributeName(att.geometrySlot);
        }
      });
      const data = await this.source.getNodeData({
        node,
        // Let's not reload the point position if we already have them,
        // as they are not going to change when switching attributes for example.
        position: info.mesh == null || info.positionDirty,
        attributes,
        signal
      });

      // An aborted signal means either: the node is no longer visible
      // or we changed the active attribute and the data is obsolete.
      if (signal.aborted) {
        return;
      }
      if (info.mesh != null) {
        // Let's just update the geometry rather
        // than recreate the material and mesh.
        this.updateGeometry(info.mesh.geometry, data, attributeNames);
        this.updateMaterial(info.mesh);
      } else {
        const mesh = this.createMesh(data, attributeNames, node.volume);
        mesh.name = node.id;
        info.mesh = mesh;
        this.onObjectCreated(mesh);
      }
      if (info.state === 'loading') {
        this._stateMachine.transition(info, 'displayed');
      }
    } catch (err) {
      if (err instanceof Error) {
        if (err.message !== 'aborted') {
          console.error(err);
        }
      } else if (err !== 'aborted') {
        console.error(err);
      }
    }
  }
  async showNode(node) {
    const info = this.getNodeInfo(node);
    if (info.state === 'hidden') {
      this._stateMachine.transition(info, 'displayed');
    } else if (info.state === 'empty') {
      this._stateMachine.transition(info, 'loading');
    }
  }
  getNodeInfo(node) {
    const withInfo = node;
    if (withInfo.info === undefined) {
      withInfo.info = emptyNodeInfo(node);
    }
    return withInfo.info;
  }
  removeDataVolumeHelper(info) {
    if (info.dataVolumeHelper) {
      const helper = info.dataVolumeHelper;
      helper.geometry.dispose();
      helper.material.dispose();
      helper.removeFromParent();
      info.dataVolumeHelper = undefined;
    }
  }
  removeVolumeHelper(info) {
    if (info.volumeHelper) {
      const helper = info.volumeHelper;
      helper.geometry.dispose();
      helper.material.dispose();
      helper.removeFromParent();
      info.volumeHelper = undefined;
    }
  }
  forEachNodeInfo(callbackfn) {
    traverseNode(this._rootNode, node => {
      callbackfn(this.getNodeInfo(node));
      return true;
    });
  }
  updateHelpers() {
    this.forEachNodeInfo(info => {
      if (this.showNodeVolumes) {
        if (info.state !== 'empty' && info.volumeHelper == null) {
          info.volumeHelper = createVolumeHelper(info);
          this._tileVolumeRoot.add(info.volumeHelper);
          info.volumeHelper.updateMatrixWorld(true);
        } else if (info.volumeHelper != null) {
          if (info.state === 'empty') {
            this.removeVolumeHelper(info);
          } else {
            info.volumeHelper.material.color = STATE_COLORS[info.state];
            info.volumeHelper.name = `${info.node.id} (${info.state})`;
          }
        }
      }
      if (this.showNodeDataVolumes) {
        if (info.dataVolumeHelper == null && info.mesh != null) {
          info.dataVolumeHelper = createTightVolumeHelper(info);
        }
      }
    });
  }
}