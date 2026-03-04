/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */

import { Box3, Color, FrontSide, MathUtils, Matrix4, Raycaster, UnsignedByteType, Vector2, Vector3 } from 'three';
import { defaultColorimetryOptions } from '../core/ColorimetryOptions';
import Coordinates from '../core/geographic/Coordinates';
import { isColorLayer } from '../core/layer/ColorLayer';
import { isElevationLayer } from '../core/layer/ElevationLayer';
import { isLayer } from '../core/layer/Layer';
import { isPickableFeatures } from '../core/picking/PickableFeatures';
import traversePickingCircle from '../core/picking/PickingCircle';
import pickTilesAt from '../core/picking/PickTilesAt';
import ScreenSpaceError from '../core/ScreenSpaceError';
import Capabilities from '../core/system/Capabilities';
import { DEFAULT_ENABLE_STITCHING, DEFAULT_ENABLE_TERRAIN, DEFAULT_MAP_SEGMENTS } from '../core/TerrainOptions';
import ColorMapAtlas from '../renderer/ColorMapAtlas';
import LayeredMaterial, { DEFAULT_AZIMUTH, DEFAULT_GRATICULE_COLOR, DEFAULT_GRATICULE_STEP, DEFAULT_GRATICULE_THICKNESS, DEFAULT_HILLSHADING_INTENSITY, DEFAULT_HILLSHADING_ZFACTOR, DEFAULT_ZENITH } from '../renderer/LayeredMaterial';
import ShadowLayeredMaterial from '../renderer/ShadowLayeredMaterial';
import { computeDistanceToFitSphere, computeZoomToFitSphere } from '../renderer/View';
import { isOrthographicCamera, isPerspectiveCamera } from '../utils/predicates';
import TextureGenerator from '../utils/TextureGenerator';
import { nonNull } from '../utils/tsutils';
import Entity3D from './Entity3D';
import { MapLightingMode } from './MapLightingOptions';
import EllipsoidTileGeometryBuilder from './tiles/EllipsoidTileGeometryBuilder';
import PlanarTileGeometryBuilder from './tiles/PlanarTileGeometryBuilder';
import PlanarTileVolume from './tiles/PlanarTileVolume';
import TileIndex from './tiles/TileIndex';
import TileMesh, { isTileMesh } from './tiles/TileMesh';

/**
 * A function that allows subdivision of the specified tile.
 * If the function returns `true`, the node can be subdivided.
 */

/**
 * Allows subdivision if:
 * - **if elevation layer present and active and terrain deformation is enabled**: wait for all elevation layers to have finished loading the tile,
 * - otherwise allow subdivision without condition
 */
export const defaultMapSubdivisionStrategy = (tile, context) => {
  // No problem subdividing if terrain deformation is disabled,
  // since bounding boxes are always up to date (as they don't have an elevation component).
  if (!context.entity.terrain.enabled) {
    return true;
  }

  // We have to wait until elevation data is loaded for this
  // tile so that the bounding box is up to date.
  return context.layers.every(layer => !layer.visible || isColorLayer(layer) || isElevationLayer(layer) && layer.isLoaded(tile.id));
};

/**
 * Allows subdivision if all layers have loaded this node, regardless the type of the layer.
 * This strategy has a greater memory, network and CPU consumption than the default strategy,
 * but can be useful to ensure a smooth rendering of tiles without visible flicker or "jumps".
 */
export const allLayersLoadedSubdivisionStrategy = (tile, context) => {
  return context.layers.every(layer => layer.isLoaded(tile.id));
};

/**
 * The default background color of maps.
 */
export const DEFAULT_MAP_BACKGROUND_COLOR = '#0a3b59';

/**
 * The default tile subdivision threshold.
 */
export const DEFAULT_SUBDIVISION_THRESHOLD = 1.5;

/**
 * Comparison function to order layers.
 */

const IDENTITY = new Matrix4().identity();

/**
 * A predicate to determine if the given tile can be used as a neighbour for stitching purposes.
 */
function isStitchableNeighbour(neighbour) {
  return !neighbour.disposed && neighbour.visible && neighbour.material.visible && neighbour.material.getElevationTexture() != null;
}

/**
 * The maximum supported aspect ratio for the map tiles, before we stop trying to create square
 * tiles. This is a safety measure to avoid huge number of root tiles when the extent is a very
 * elongated rectangle. If the map extent has a greater ratio than this value, the generated tiles
 * will not be square-ish anymore.
 */
const MAX_SUPPORTED_ASPECT_RATIO = 10;
const tmpVector = new Vector3();
const tmpBox3 = new Box3();
const tempNDC = new Vector2();
const tempDims = new Vector2();
const tempCanvasCoords = new Vector2();
const tmpSseSizes = [0, 0];
const tmpIntersectList = [];
const tmpNeighbours = [null, null, null, null, null, null, null, null];
function getContourLineOptions(input) {
  if (input == null) {
    // Default values
    return {
      enabled: false,
      thickness: 1,
      interval: 100,
      secondaryInterval: 20,
      color: new Color(0, 0, 0),
      opacity: 1
    };
  }
  if (typeof input === 'boolean') {
    // Default values
    return {
      enabled: true,
      thickness: 1,
      interval: 100,
      secondaryInterval: 20,
      color: new Color(0, 0, 0),
      opacity: 1
    };
  }
  return {
    enabled: input.enabled ?? false,
    thickness: input.thickness ?? 1,
    interval: input.interval ?? 100,
    secondaryInterval: input.secondaryInterval ?? 20,
    color: input.color ?? new Color(0, 0, 0),
    opacity: input.opacity ?? 1
  };
}
function getTerrainOptions(input, defaultValue) {
  if (input == null) {
    // Default values
    return {
      ...defaultValue
    };
  }
  if (typeof input === 'boolean') {
    return {
      enabled: input,
      stitching: defaultValue.stitching,
      segments: defaultValue.segments,
      skirts: {
        enabled: false,
        depth: 0
      }
    };
  }
  return {
    enabled: input.enabled ?? defaultValue.enabled,
    stitching: input.stitching ?? defaultValue.stitching,
    segments: input.segments ?? defaultValue.segments,
    skirts: input.skirts ?? defaultValue.skirts
  };
}
function getGraticuleOptions(input) {
  if (input == null) {
    // Default values
    return {
      enabled: false,
      color: DEFAULT_GRATICULE_COLOR,
      xStep: DEFAULT_GRATICULE_STEP,
      yStep: DEFAULT_GRATICULE_STEP,
      xOffset: 0,
      yOffset: 0,
      thickness: DEFAULT_GRATICULE_THICKNESS,
      opacity: 1
    };
  }
  if (typeof input === 'boolean') {
    return {
      enabled: input,
      color: DEFAULT_GRATICULE_COLOR,
      xStep: DEFAULT_GRATICULE_STEP,
      yStep: DEFAULT_GRATICULE_STEP,
      xOffset: 0,
      yOffset: 0,
      thickness: DEFAULT_GRATICULE_THICKNESS,
      opacity: 1
    };
  }
  return {
    enabled: input.enabled ?? true,
    color: input.color ?? DEFAULT_GRATICULE_COLOR,
    thickness: input.thickness ?? DEFAULT_GRATICULE_THICKNESS,
    xStep: input.xStep ?? DEFAULT_GRATICULE_STEP,
    yStep: input.yStep ?? DEFAULT_GRATICULE_STEP,
    xOffset: input.xOffset ?? 0,
    yOffset: input.yOffset ?? 0,
    opacity: input.opacity ?? 1
  };
}
function getColorimetryOptions(input) {
  return input ?? defaultColorimetryOptions();
}
function getLightingOptions(input, defaultValue) {
  if (input == null) {
    // Default values
    return {
      ...defaultValue
    };
  }
  if (typeof input === 'boolean') {
    // Default values
    return {
      ...defaultValue,
      enabled: input
    };
  }
  return {
    enabled: input.enabled ?? defaultValue.enabled,
    mode: input.mode ?? defaultValue.mode,
    elevationLayersOnly: input.elevationLayersOnly ?? defaultValue.elevationLayersOnly,
    hillshadeAzimuth: input.hillshadeAzimuth ?? defaultValue.hillshadeAzimuth,
    hillshadeZenith: input.hillshadeZenith ?? defaultValue.hillshadeZenith,
    hillshadeIntensity: input.hillshadeIntensity ?? defaultValue.hillshadeIntensity,
    zFactor: input.zFactor ?? defaultValue.zFactor
  };
}

/**
 * Compute the best image size for tiles, taking into account the extent ratio.
 * In other words, rectangular tiles will have more pixels in their longest side.
 *
 * @param extent - The map extent.
 */
function computeImageSize(extent) {
  const baseSize = 512;
  const dims = extent.dimensions(tempDims);
  const ratio = dims.x / dims.y;
  if (Math.abs(ratio - 1) < 0.01) {
    // We have a square tile
    return new Vector2(baseSize, baseSize);
  }
  if (ratio > 1) {
    const actualRatio = Math.min(ratio, MAX_SUPPORTED_ASPECT_RATIO);
    // We have an horizontal tile
    return new Vector2(Math.round(baseSize * actualRatio), baseSize);
  }
  const actualRatio = Math.min(1 / ratio, MAX_SUPPORTED_ASPECT_RATIO);

  // We have a vertical tile
  return new Vector2(baseSize, Math.round(baseSize * actualRatio));
}
function getWidestDataType(layers) {
  // Select the type that can contain all the layers (i.e the widest data type.)
  let currentSize = -1;
  let result = UnsignedByteType;
  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    const type = layer.getRenderTargetDataType();
    const size = TextureGenerator.getBytesPerChannel(type);
    if (size > currentSize) {
      currentSize = size;
      result = type;
    }
  }
  return result;
}

/**
 * Constructor options for the {@link Map} entity.
 */

/**
 * A map is an {@link Entity3D} that represents a flat surface displaying one or more {@link core.layer.Layer | layer(s)}.
 *
 * ## Supported layers
 *
 * Maps support various types of layers.
 *
 * ### Color layers
 *
 * Maps can contain any number of {@link core.layer.ColorLayer | color layers}, as well as any number of {@link core.layer.MaskLayer | mask layers}.
 *
 * Color layers are used to display satellite imagery, vector features or any other dataset.
 * Mask layers are used to mask parts of a map (like an alpha channel).
 *
 * ### Elevation layers
 *
 * Up to one elevation layer can be added to a map, to provide features related to elevation, such
 * as terrain deformation, shading, contour lines, etc. Without an elevation layer, the map
 * will appear like a flat rectangle on the specified extent.
 *
 * Note: to benefit from the features given by elevation layers (shading for instance) while keeping
 * a flat map, disable terrain in the {@link TerrainOptions}.
 *
 * 💡 The elevation data can be sampled by the {@link getElevation} method.
 *
 * ## Picking on maps
 *
 * Maps can be picked like any other 3D entity, using the {@link entities.Entity3D#pick | pick()} method.
 *
 * ### GPU-based picking
 *
 * This is the default method for picking maps. When the user calls {@link entities.Entity3D#pick | pick()},
 * the camera's field of view is rendered into a temporary texture, then the pixel(s) around the picked
 * point are analyzed to determine the location of the picked point.
 *
 * The main advantage of this method is that it ignores transparent pixels of the map (such as
 * no-data elevation pixels, or transparent color layers).
 *
 * ### Raycasting-based picking
 *
 * 💡 This method requires that {@link core.picking.PickOptions.gpuPicking} is disabled.
 *
 * This method casts a ray that is then intersected with the map's meshes. The first intersection is
 * returned.
 *
 * The main advantage of this method is that it's much faster and puts less pressure on the GPU.
 *
 * ## Lighting and shadows
 *
 * The Map currently support two lighting modes:
 * - the simplified, hillshade model
 * - the dynamic, light-based model, that uses three.js lights
 *
 * Both modes support casting shadows from the Map (on other objects), but only the light-based
 * mode enables Maps to _receive_ shadows (from itself or other objects).
 *
 * @typeParam UserData - The type of the {@link entities.Entity#userData} property.
 */
class Map extends Entity3D {
  isMap = true;
  type = 'Map';
  hasLayers = true;
  isPickableFeatures = true;
  _objectOptions = {
    castShadow: true,
    receiveShadow: true
  };
  _layers = [];
  _allTiles = new Set();
  _cachedTraversals = new globalThis.Map();
  _layerIds = new Set();
  _paintCompleteTimeout = null;
  _geometryBuilder = null;
  _hasElevationLayer = false;
  _elevationScaling = 1;
  _colorAtlasDataType = UnsignedByteType;
  _wireframe = false;
  getMemoryUsage(context) {
    this._layers.forEach(layer => layer.getMemoryUsage(context));
    this._allTiles.forEach(tile => tile.getMemoryUsage(context));
  }

  /**
   * Constructs a Map object.
   *
   * @param options - Constructor options.
   */
  constructor(options) {
    super(options);
    this._rootTiles = [];
    this._layerIndices = new window.Map();
    if (!options.extent.isValid()) {
      throw new Error('Invalid extent: minX must be less than maxX and minY must be less than maxY.');
    }
    this.extent = options.extent;
    this._onNodeComplete = this.onNodeComplete.bind(this);
    this._subdivisionStrategy = options.subdivisionStrategy ?? defaultMapSubdivisionStrategy;
    this._subdivisionThreshold = options.subdivisionThreshold ?? DEFAULT_SUBDIVISION_THRESHOLD;
    this.maxSubdivisionLevel = options.maxSubdivisionLevel ?? 30;
    this._onTileElevationChanged = this.onTileElevationChanged.bind(this);
    this._onLayerVisibilityChanged = this.onLayerVisibilityChanged.bind(this);
    this._materialOptions = {
      showColliderMeshes: false,
      showBoundingSpheres: false,
      helperColor: 'cyan',
      showBoundingBoxes: false,
      forceTextureAtlases: options.forceTextureAtlases ?? false,
      lighting: getLightingOptions(options.lighting, this.getDefaultLightingOptions()),
      contourLines: getContourLineOptions(options.contourLines),
      discardNoData: options.discardNoData ?? false,
      side: options.side ?? FrontSide,
      depthTest: options.depthTest ?? true,
      showTileOutlines: options.showOutline ?? false,
      terrain: getTerrainOptions(options.terrain, this.getDefaultTerrainOptions()),
      colorimetry: getColorimetryOptions(options.colorimetry),
      graticule: getGraticuleOptions(options.graticule),
      colorMapAtlas: null,
      elevationRange: options.elevationRange ?? null,
      backgroundOpacity: options.backgroundOpacity ?? 1,
      tileOutlineColor: new Color(options.outlineColor ?? '#ff0000'),
      backgroundColor: options.backgroundColor !== undefined ? new Color(options.backgroundColor) : new Color(DEFAULT_MAP_BACKGROUND_COLOR)
    };
    this._tileIndex = new TileIndex();
  }
  get tileIndex() {
    return this._tileIndex;
  }

  /**
   * Gets the tiles at the root of the hierarchy (i.e LOD 0).
   */
  get rootTiles() {
    return this._rootTiles;
  }

  /**
   * Returns `true` if this map is currently processing data.
   */
  get loading() {
    return this._layers.some(l => l.loading);
  }
  onNodeComplete() {
    if (this._paintCompleteTimeout) {
      clearTimeout(this._paintCompleteTimeout);
    }
    this._paintCompleteTimeout = setTimeout(this.evaluatePaintComplete.bind(this), 500);
  }
  evaluatePaintComplete() {
    let complete = true;
    this.traverseTiles(tile => {
      if (tile.visible && tile.material.visible) {
        const tileComplete = this._layers.filter(l => l.visible).every(l => l.isLoaded(tile.id));
        if (!tileComplete) {
          complete = false;
        }
      }
    });
    if (complete) {
      this.dispatchEvent({
        type: 'paint-complete'
      });
    }
  }

  /**
   * Gets the loading progress (between 0 and 1) of the map. This is the average progress of all
   * layers in this map.
   * Note: if no layer is present, this will always be 1.
   * Note: This value is only meaningful is {@link loading} is `true`.
   */
  get progress() {
    if (this._layers.length === 0) {
      return 1;
    }
    const sum = this._layers.reduce((accum, layer) => accum + layer.progress, 0);
    return sum / this._layers.length;
  }

  /**
   * Gets or sets depth testing on materials.
   */
  get depthTest() {
    return this._materialOptions.depthTest;
  }
  set depthTest(v) {
    this._materialOptions.depthTest = v;
  }

  /**
   * Gets or sets the background opacity.
   */
  get backgroundOpacity() {
    return this._materialOptions.backgroundOpacity;
  }
  set backgroundOpacity(opacity) {
    this._materialOptions.backgroundOpacity = opacity;
  }

  /**
   * Gets or sets the terrain options.
   */
  get terrain() {
    return this._materialOptions.terrain;
  }
  set terrain(terrain) {
    this._materialOptions.terrain = getTerrainOptions(terrain, this.getDefaultTerrainOptions());
  }

  /**
   * The global factor that drives SSE (screen space error) computation. The lower this value, the
   * sooner a tile is subdivided. Note: changing this scale to a value less than 1 can drastically
   * increase the number of tiles displayed in the scene, and can even lead to WebGL crashes.
   *
   * @defaultValue {@link DEFAULT_SUBDIVISION_THRESHOLD}
   */
  get subdivisionThreshold() {
    return this._subdivisionThreshold;
  }
  set subdivisionThreshold(v) {
    this._subdivisionThreshold = v;
  }

  /**
   * Gets or sets the sidedness of the map surface:
   * - `FrontSide` will only display the "above ground" side of the map (in cartesian maps),
   * or the outer shell of the map (in globe settings).
   * - `BackSide` will only display the "underground" side of the map (in cartesian maps),
   * or the inner shell of the map (in globe settings).
   * - `DoubleSide` will display both sides of the map.
   * @defaultValue `FrontSide`
   */
  get side() {
    return this._materialOptions.side;
  }
  set side(newSide) {
    this._materialOptions.side = newSide;
  }

  /**
   * Toggles discard no-data pixels.
   */
  get discardNoData() {
    return this._materialOptions.discardNoData;
  }
  set discardNoData(opacity) {
    this._materialOptions.discardNoData = opacity;
  }

  /**
   * Gets or sets the background color.
   */
  get backgroundColor() {
    return this._materialOptions.backgroundColor;
  }
  set backgroundColor(c) {
    this._materialOptions.backgroundColor = new Color(c);
  }

  /**
   * Gets or sets graticule options.
   */
  get graticule() {
    return this._materialOptions.graticule;
  }
  set graticule(opts) {
    this._materialOptions.graticule = getGraticuleOptions(opts);
  }
  updateObject(obj) {
    const opts = this._objectOptions;
    obj.castShadow = opts.castShadow;
    obj.receiveShadow = opts.receiveShadow;
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
   * Note that map tiles will receive shadows only if {@link lighting} mode is set to {@link MapLightingMode.LightBased}.
   */
  get receiveShadow() {
    return this._objectOptions.receiveShadow;
  }
  set receiveShadow(v) {
    this.updateObjectOption('receiveShadow', v);
  }

  /**
   * Gets or sets lighting options.
   */
  get lighting() {
    return this._materialOptions.lighting;
  }
  set lighting(opts) {
    this._materialOptions.lighting = getLightingOptions(opts, this.getDefaultLightingOptions());
  }

  /**
   * Gets or sets colorimetry options.
   */
  get colorimetry() {
    return this._materialOptions.colorimetry;
  }
  set colorimetry(opts) {
    this._materialOptions.colorimetry = opts;
  }

  /**
   * Gets or sets elevation range.
   */
  get elevationRange() {
    return this._materialOptions.elevationRange;
  }
  set elevationRange(range) {
    this._materialOptions.elevationRange = range;
  }

  /**
   * Shows tile outlines.
   */
  get showTileOutlines() {
    return this._materialOptions.showTileOutlines;
  }
  set showTileOutlines(show) {
    this._materialOptions.showTileOutlines = show;
  }

  /**
   * Gets or sets tile outline color.
   */
  get tileOutlineColor() {
    return this._materialOptions.tileOutlineColor;
  }
  set tileOutlineColor(color) {
    this._materialOptions.tileOutlineColor = new Color(color);
  }

  /**
   * Gets or sets contour line options.
   */
  get contourLines() {
    return this._materialOptions.contourLines;
  }
  set contourLines(opts) {
    this._materialOptions.contourLines = getContourLineOptions(opts);
  }

  /**
   * Shows volumes of tiles.
   */
  get showBoundingBoxes() {
    return this._materialOptions.showBoundingBoxes;
  }
  set showBoundingBoxes(show) {
    if (this._materialOptions.showBoundingBoxes !== show) {
      this._materialOptions.showBoundingBoxes = show;
      this.notifyChange(this);
    }
  }

  /**
   * Shows volumes of tiles.
   */
  get showBoundingSpheres() {
    return this._materialOptions.showBoundingSpheres;
  }
  set showBoundingSpheres(show) {
    if (this._materialOptions.showBoundingSpheres !== show) {
      this._materialOptions.showBoundingSpheres = show;
      this.notifyChange(this);
    }
  }

  /**
   * Shows volumes of tiles.
   */
  get helperColor() {
    return this._materialOptions.helperColor;
  }
  set helperColor(color) {
    if (this._materialOptions.helperColor !== color) {
      this._materialOptions.helperColor = color;
      this.notifyChange(this);
    }
  }

  /**
   * Shows meshes used for raycasting purposes.
   */
  get showColliderMeshes() {
    return this._materialOptions.showColliderMeshes;
  }
  set showColliderMeshes(show) {
    if (this._materialOptions.showColliderMeshes !== show) {
      this._materialOptions.showColliderMeshes = show;
      this.notifyChange(this);
    }
  }
  get segments() {
    return this._materialOptions.terrain.segments;
  }
  set segments(v) {
    if (this._materialOptions.terrain.segments !== v) {
      if (MathUtils.isPowerOfTwo(v) && v >= 1 && v <= 128) {
        this._materialOptions.terrain.segments = v;
        if (this._geometryBuilder instanceof PlanarTileGeometryBuilder || this._geometryBuilder instanceof EllipsoidTileGeometryBuilder) {
          this._geometryBuilder.segments = v;
        }
        this.updateGeometries();
        this.notifyChange(this);
      } else {
        throw new Error('invalid segments. Must be a power of two between 1 and 128 included');
      }
    }
  }

  /**
   * Displays the map tiles in wireframe.
   */
  get wireframe() {
    return this._wireframe;
  }
  set wireframe(v) {
    if (v !== this._wireframe) {
      this._wireframe = v;
      this.traverseTiles(tile => {
        tile.material.wireframe = v;
      });
    }
  }
  subdivideNode(context, node) {
    if (!node.children.some(n => isTileMesh(n))) {
      const extents = node.extent.split(2, 2);
      let i = 0;
      const {
        x,
        y,
        z
      } = node.coordinate;
      for (const extent of extents) {
        let child;
        if (i === 0) {
          child = this.requestNewTile(extent, node, z + 1, 2 * x + 0, 2 * y + 0);
        } else if (i === 1) {
          child = this.requestNewTile(extent, node, z + 1, 2 * x + 0, 2 * y + 1);
        } else if (i === 2) {
          child = this.requestNewTile(extent, node, z + 1, 2 * x + 1, 2 * y + 0);
        } else {
          child = this.requestNewTile(extent, node, z + 1, 2 * x + 1, 2 * y + 1);
        }

        // inherit our parent's textures
        for (const e of this.getElevationLayers()) {
          e.update(context, child);
        }
        for (const c of this.getColorLayers()) {
          c.update(context, child);
        }
        child.update(this._materialOptions);
        child.updateMatrixWorld(true);
        i++;
      }
      this.notifyChange(node);
    }
  }
  updateGeometries() {
    this.traverseTiles(tile => {
      tile.segments = this.segments;
    });
  }

  /**
   * Gets the number of vertical and horizontal subdivisions for the root tile matrix.
   */
  getRootTileMatrix() {
    return nonNull(this._geometryBuilder).rootTileMatrix;
  }
  preprocess() {
    if (!this.extent.crs.equals(this.getComposerProjection())) {
      throw new Error(`The extent of this map is not in the correct CRS. Expected: ${this.getComposerProjection().id}, got: ${this.extent.crs.id}`);
    }
    this._geometryBuilder = this.getGeometryBuilder();
    const subdivs = this.getRootTileMatrix();

    // If the map is not square, we want to have more than a single
    // root tile to avoid elongated tiles that hurt visual quality and SSE computation.
    const rootExtents = this.extent.split(subdivs.x, subdivs.y);
    let i = 0;
    for (const root of rootExtents) {
      if (subdivs.x > subdivs.y) {
        this._rootTiles.push(this.requestNewTile(root, undefined, 0, i, 0));
      } else if (subdivs.y > subdivs.x) {
        this._rootTiles.push(this.requestNewTile(root, undefined, 0, 0, i));
      } else {
        this._rootTiles.push(this.requestNewTile(root, undefined, 0, 0, 0));
      }
      i++;
    }
    for (const tile of this._rootTiles) {
      this.object3d.add(tile);
      tile.updateMatrixWorld(false);
    }
    return Promise.resolve();
  }

  /**
   * Compute the best image size for tiles, taking into account the extent ratio.
   * In other words, rectangular tiles will have more pixels in their longest side.
   *
   * @param extent - The tile extent.
   */
  getTextureSize(extent) {
    return computeImageSize(extent);
  }
  getTileDimensions(extent) {
    return extent.dimensions();
  }
  get isEllipsoidal() {
    return false;
  }
  getComposerProjection() {
    return this.instance.coordinateSystem;
  }
  getGeometryBuilder() {
    return new PlanarTileGeometryBuilder({
      extent: this.extent,
      maxAspectRatio: MAX_SUPPORTED_ASPECT_RATIO,
      segments: this.segments,
      skirtDepth: this.terrain.skirts.enabled ? this.terrain.skirts.depth : undefined
    });
  }
  requestNewTile(extent, parent, z, x = 0, y = 0) {
    const textureSize = this.getTextureSize(extent);
    const materialOptions = {
      renderer: this.instance.renderer,
      options: this._materialOptions,
      textureSize,
      extent,
      tileDimensions: this.getTileDimensions(extent),
      getIndexFn: this.getIndex.bind(this),
      textureDataType: this._colorAtlasDataType,
      hasElevationLayer: this._hasElevationLayer,
      maxTextureImageUnits: Capabilities.getMaxTextureUnitsCount(),
      isGlobe: this.isEllipsoidal
    };
    const material = new LayeredMaterial(materialOptions);
    const depthMaterial = new ShadowLayeredMaterial({
      ...materialOptions,
      source: material,
      shadowMode: 'depth'
    });
    const distanceMaterial = new ShadowLayeredMaterial({
      ...materialOptions,
      source: material,
      shadowMode: 'distance'
    });
    const tile = new TileMesh({
      renderer: this.instance.renderer,
      material,
      depthMaterial,
      distanceMaterial,
      extent,
      textureSize,
      segments: this.segments,
      coord: {
        z,
        x,
        y
      },
      skirtDepth: this.terrain.skirts.enabled ? this.terrain.skirts.depth : undefined,
      enableTerrainDeformation: this._materialOptions.terrain.enabled ?? true,
      onElevationChanged: this._onTileElevationChanged,
      geometryBuilder: nonNull(this._geometryBuilder),
      volume: this.createTileVolume(extent)
    });
    tile.setVerticalScaling(this._elevationScaling);
    this._allTiles.add(tile);
    this._tileIndex.addTile(tile);
    this._cachedTraversals.clear();
    tile.material.opacity = this.opacity;
    const position = tile.absolutePosition;
    tile.position.copy(position);
    tile.opacity = this.opacity;
    tile.setVisibility(false);
    tile.updateMatrix();
    tile.material.wireframe = this.wireframe || false;
    if (parent) {
      tile.setBBoxZ(parent.minmax.min, parent.minmax.max);
    } else {
      const {
        min,
        max
      } = this.getElevationMinMax();
      tile.setBBoxZ(min, max);
    }
    this.updateObject(tile);
    this.onObjectCreated(tile);
    if (parent) {
      parent.addChildTile(tile);
    }
    return tile;
  }
  createTileVolume(extent) {
    return new PlanarTileVolume({
      extent,
      range: {
        min: -1,
        max: +1
      }
    });
  }
  onTileElevationChanged(tile) {
    this.dispatchEvent({
      type: 'elevation-changed',
      extent: tile.extent
    });
  }

  /**
   * Sets the render state of the map.
   *
   * @internal
   * @param state - The new state.
   * @returns The function to revert to the previous state.
   */
  setRenderState(state) {
    const restores = this._rootTiles.map(n => n.pushRenderState(state));
    return () => {
      restores.forEach(r => r());
    };
  }
  pick(coordinates, options) {
    if (options?.gpuPicking === true) {
      return pickTilesAt(this.instance, coordinates, this, options);
    } else {
      return this.pickUsingRaycast(coordinates, options);
    }
  }
  raycastAtCoordinate(coordinates, results, options) {
    const normalized = this.instance.canvasToNormalizedCoords(coordinates, tempNDC);
    const raycaster = new Raycaster();
    raycaster.setFromCamera(normalized, this.instance.view.camera);
    tmpIntersectList.length = 0;
    this.raycast(raycaster, tmpIntersectList);
    const filter = options?.filter ?? (() => true);
    if (tmpIntersectList.length > 0) {
      tmpIntersectList.sort((a, b) => a.distance - b.distance);
      const intersect = tmpIntersectList[0];
      const {
        x,
        y,
        z
      } = intersect.point;
      const pickResult = {
        isMapPickResult: true,
        coord: new Coordinates(this.instance.coordinateSystem, x, y, z),
        entity: this,
        ...intersect
      };
      if (filter(pickResult)) {
        results.push(pickResult);
      }
    }
  }
  getDefaultTerrainOptions() {
    return {
      enabled: DEFAULT_ENABLE_TERRAIN,
      stitching: DEFAULT_ENABLE_STITCHING,
      segments: DEFAULT_MAP_SEGMENTS,
      skirts: {
        enabled: false,
        depth: 0
      }
    };
  }
  getDefaultLightingOptions() {
    return {
      enabled: false,
      mode: MapLightingMode.Hillshade,
      elevationLayersOnly: false,
      hillshadeIntensity: DEFAULT_HILLSHADING_INTENSITY,
      zFactor: DEFAULT_HILLSHADING_ZFACTOR,
      hillshadeAzimuth: DEFAULT_AZIMUTH,
      hillshadeZenith: DEFAULT_ZENITH
    };
  }
  pickUsingRaycast(coordinates, options) {
    const results = [];
    const radius = options?.radius;
    if (radius == null || radius === 0) {
      this.raycastAtCoordinate(coordinates, results, options);
    } else {
      const originX = coordinates.x;
      const originY = coordinates.y;
      traversePickingCircle(radius, (x, y) => {
        tempCanvasCoords.set(originX + x, originY + y);
        this.raycastAtCoordinate(tempCanvasCoords, results, options);
        return null;
      });
    }
    return results;
  }

  /**
   * Perform raycasting on visible tiles.
   * @param raycaster - The THREE raycaster.
   * @param intersects  - The intersections array to populate with intersections.
   */
  raycast(raycaster, intersects) {
    this.traverseTiles(tile => {
      if (!tile.disposed && tile.visible && tile.material.visible) {
        tile.raycast(raycaster, intersects);
      }
    });
    intersects.sort((a, b) => a.distance - b.distance);
  }
  pickFeaturesFrom(pickedResult, options) {
    const result = [];
    for (const layer of this._layers) {
      if (isPickableFeatures(layer)) {
        const res = layer.pickFeaturesFrom(pickedResult, options);
        result.push(...res);
      }
    }
    pickedResult.features = result;
    return result;
  }
  preUpdate(context, changeSources) {
    super.preUpdate(context, changeSources);
    this._materialOptions.colorMapAtlas?.update();
    this._tileIndex.update();
    if (changeSources.has(undefined) || changeSources.size === 0) {
      return this._rootTiles;
    }
    let commonAncestor = null;
    for (const source of changeSources.values()) {
      if (source.isCamera) {
        // if the change is caused by a camera move, no need to bother
        // to find common ancestor: we need to update the whole tree:
        // some invisible tiles may now be visible
        return this._rootTiles;
      }
      if (isTileMesh(source)) {
        if (!commonAncestor) {
          commonAncestor = source;
        } else {
          commonAncestor = source.findCommonAncestor(commonAncestor);
          if (!commonAncestor) {
            return this._rootTiles;
          }
        }
        if (commonAncestor.material == null) {
          commonAncestor = null;
        }
      }
    }
    if (commonAncestor) {
      return [commonAncestor];
    }
    return this._rootTiles;
  }

  /**
   * Sort the color layers according to the comparator function.
   *
   * @param compareFn - The comparator function.
   */
  sortColorLayers(compareFn) {
    if (compareFn == null) {
      throw new Error('missing comparator function');
    }
    this._layers.sort((a, b) => {
      if (isColorLayer(a) && isColorLayer(b)) {
        return compareFn(a, b);
      }

      // Sorting elevation layers has no effect currently, so by convention
      // we push them to the start of the list.
      if (isElevationLayer(a) && isElevationLayer(b)) {
        return 0;
      }
      if (isElevationLayer(a)) {
        return -1;
      }
      return 1;
    });
    this.reorderLayers();
  }

  /**
   * Moves the layer closer to the foreground.
   *
   * Note: this only applies to color layers.
   *
   * @param layer - The layer to move.
   * @throws If the layer is not present in the map.
   * @example
   * map.addLayer(foo);
   * map.addLayer(bar);
   * map.addLayer(baz);
   * // Layers (back to front) : foo, bar, baz
   *
   * map.moveLayerUp(foo);
   * // Layers (back to front) : bar, foo, baz
   */
  moveLayerUp(layer) {
    const position = this._layers.indexOf(layer);
    if (position === -1) {
      throw new Error('The layer is not present in the map.');
    }
    if (position < this._layers.length - 1) {
      const next = this._layers[position + 1];
      this._layers[position + 1] = layer;
      this._layers[position] = next;
      this.reorderLayers();
    }
  }
  onRenderingContextRestored() {
    this._materialOptions.colorMapAtlas?.forceUpdate();
    this.forEachLayer(layer => layer.onRenderingContextRestored());
    this.notifyChange(this);
  }

  /**
   * Moves the specified layer after the other layer in the list.
   *
   * @param layer - The layer to move.
   * @param target - The target layer. If `null`, then the layer is put at the
   * beginning of the layer list.
   * @throws If the layer is not present in the map.
   * @example
   * map.addLayer(foo);
   * map.addLayer(bar);
   * map.addLayer(baz);
   * // Layers (back to front) : foo, bar, baz
   *
   * map.insertLayerAfter(foo, baz);
   * // Layers (back to front) : bar, baz, foo
   */
  insertLayerAfter(layer, target) {
    const position = this._layers.indexOf(layer);
    let afterPosition = target == null ? -1 : this._layers.indexOf(target);
    if (position === -1) {
      throw new Error('The layer is not present in the map.');
    }
    if (afterPosition === -1) {
      afterPosition = 0;
    }
    this._layers.splice(position, 1);
    afterPosition = target == null ? -1 : this._layers.indexOf(target);
    this._layers.splice(afterPosition + 1, 0, layer);
    this.reorderLayers();
  }

  /**
   * Moves the layer closer to the background.
   *
   * Note: this only applies to color layers.
   *
   * @param layer - The layer to move.
   * @throws If the layer is not present in the map.
   * @example
   * map.addLayer(foo);
   * map.addLayer(bar);
   * map.addLayer(baz);
   * // Layers (back to front) : foo, bar, baz
   *
   * map.moveLayerDown(baz);
   * // Layers (back to front) : foo, baz, bar
   */
  moveLayerDown(layer) {
    const position = this._layers.indexOf(layer);
    if (position === -1) {
      throw new Error('The layer is not present in the map.');
    }
    if (position > 0) {
      const prev = this._layers[position - 1];
      this._layers[position - 1] = layer;
      this._layers[position] = prev;
      this.reorderLayers();
    }
  }

  /**
   * Returns the position of the layer in the layer list, or -1 if it is not found.
   *
   * @param layer - The layer to search.
   * @returns The index of the layer.
   */
  getIndex(layer) {
    const value = this._layerIndices.get(layer.id);
    if (value == null) {
      return -1;
    }
    return value;
  }
  reorderLayers() {
    const layers = this._layers;
    for (let i = 0; i < layers.length; i++) {
      const element = layers[i];
      this._layerIndices.set(element.id, i);
    }
    this.traverseTiles(tile => tile.reorderLayers());
    this.dispatchEvent({
      type: 'layer-order-changed'
    });
    this.notifyChange(this);
  }
  contains(obj) {
    if (obj.isLayer) {
      return this._layers.includes(obj);
    }
    return false;
  }
  update(context, node) {
    if (!node.parent) {
      this.disposeTile(node);
      return undefined;
    }

    // do proper culling
    if (!this.frozen) {
      node.visible = this.testVisibility(node, context);
    }
    if (node.visible) {
      let requestChildrenUpdate = false;
      if (!this.frozen) {
        if (this.shouldSubdivide(context, node) && this._subdivisionStrategy(node, {
          entity: this,
          layers: this._layers
        })) {
          this.subdivideNode(context, node);
          // display iff children aren't ready
          node.setDisplayed(false);
          requestChildrenUpdate = true;
        } else {
          node.setDisplayed(true);
        }
      } else {
        requestChildrenUpdate = true;
      }
      if (node.material.visible) {
        node.material.update(this._materialOptions);

        // update uniforms
        if (!requestChildrenUpdate) {
          this._cachedTraversals.clear();
          return node.detachChildren();
        }
      }
      return requestChildrenUpdate ? node.children.filter(n => isTileMesh(n)) : undefined;
    }
    node.setDisplayed(false);
    this._cachedTraversals.clear();
    return node.detachChildren();
  }
  testVisibility(node, context) {
    node.update(this._materialOptions);

    // Frustum culling
    const obb = node.getOBB();
    return context.view.isOBBVisible(obb);
  }
  postUpdate(context) {
    this.traverseTiles(tile => {
      if (tile.visible && tile.material.visible) {
        this._layers.forEach(layer => layer.update(context, tile));
        this.updateMinMaxDistance(context, tile);
      }
    });
    this._layers.forEach(l => l.postUpdate());
    const computeNeighbours = this._materialOptions.terrain.stitching && this._materialOptions.terrain.enabled;
    if (computeNeighbours) {
      this.traverseTiles(tile => {
        if (tile.material.visible) {
          const neighbours = this._tileIndex.getNeighbours(tile, tmpNeighbours, isStitchableNeighbour);
          tile.processNeighbours(neighbours);
        }
      });
    }
  }
  registerColorLayer() {
    this._colorAtlasDataType = getWidestDataType(this.getColorLayers());
  }
  updateGlobalMinMax() {
    const minmax = this.getElevationMinMax();
    this.traverseTiles(tile => {
      tile.setBBoxZ(minmax.min, minmax.max);
    });
  }
  registerColorMap(colorMap) {
    if (!this._materialOptions.colorMapAtlas) {
      this._materialOptions.colorMapAtlas = new ColorMapAtlas(this.instance.renderer);
      this.traverseTiles(t => {
        t.material.setColorMapAtlas(this._materialOptions.colorMapAtlas);
      });
    }
    this._materialOptions.colorMapAtlas.add(colorMap);
  }

  /**
   * Adds a layer, then returns the created layer.
   * Before using this method, make sure that the map is added in an instance.
   * If the extent or the projection of the layer is not provided,
   * those values will be inherited from the map.
   *
   * @param layer - the layer to add
   * @returns a promise resolving when the layer is ready
   */
  async addLayer(layer) {
    if (!isLayer(layer)) {
      throw new Error('layer is not an instance of Layer');
    }
    if (this._layerIds.has(layer.id)) {
      throw new Error(`layer ${layer.name ?? layer.id} is already present in this map`);
    }
    this._layerIds.add(layer.id);
    this._layers.push(layer);
    await layer.initialize({
      instance: this.instance,
      composerProjection: this.getComposerProjection()
    });
    layer.addEventListener('node-complete', this._onNodeComplete);
    layer.addEventListener('visible-property-changed', this._onLayerVisibilityChanged);
    if (isColorLayer(layer)) {
      this.registerColorLayer();
    } else if (isElevationLayer(layer)) {
      this._hasElevationLayer = true;
      this._elevationScaling = layer.source.getCrs().metersPerVerticalUnit / this.instance.coordinateSystem.metersPerVerticalUnit;
      for (const tileMesh of this._allTiles) {
        tileMesh.setVerticalScaling(this._elevationScaling);
      }
      this.updateGlobalMinMax();
    }
    if (layer.colorMap) {
      this.registerColorMap(layer.colorMap);
    }
    this.reorderLayers();
    this.notifyChange(this);
    this.dispatchEvent({
      type: 'layer-added',
      layer
    });
    return layer;
  }
  onLayerVisibilityChanged(event) {
    if (isElevationLayer(event.target)) {
      this.dispatchEvent({
        type: 'elevation-changed',
        extent: this.extent
      });
      this.updateGlobalMinMax();
    }
    this.traverseTiles(tile => {
      tile.onLayerVisibilityChanged(event.target);
    });
  }

  /**
   * Removes a layer from the map.
   *
   * @param layer - the layer to remove
   * @param options - The options.
   * @returns `true` if the layer was present, `false` otherwise.
   */
  removeLayer(layer, options = {}) {
    if (layer == null) {
      return false;
    }
    if (this._layerIds.has(layer.id)) {
      this._layerIds.delete(layer.id);
      this._layers.splice(this._layers.indexOf(layer), 1);
      if (layer.colorMap) {
        this._materialOptions.colorMapAtlas?.remove(layer.colorMap);
      }
      if (isElevationLayer(layer)) {
        this._hasElevationLayer = false;
      }
      this.traverseTiles(tile => {
        layer.unregisterNode(tile);
      });
      layer.removeEventListener('visible-property-changed', this._onLayerVisibilityChanged);
      layer.removeEventListener('node-complete', this._onNodeComplete);
      layer.postUpdate();
      this.reorderLayers();
      this.dispatchEvent({
        type: 'layer-removed',
        layer
      });
      this.notifyChange(this);
      if (options.disposeLayer === true) {
        layer.dispose();
      }
      return true;
    }
    return false;
  }
  get layerCount() {
    return this._layers.length;
  }
  forEachLayer(callback) {
    this._layers.forEach(l => callback(l));
  }

  /**
   * Gets all layers that satisfy the filter predicate.
   *
   * @param predicate - the optional predicate.
   * @returns the layers that matched the predicate or all layers if no predicate was provided.
   */
  getLayers(predicate) {
    const result = [];
    for (const layer of this._layers) {
      if (!predicate || predicate(layer)) {
        result.push(layer);
      }
    }
    return result;
  }

  /**
   * Gets all color layers in this map.
   *
   * @returns the color layers
   */
  getColorLayers() {
    return this.getLayers(l => l.isColorLayer);
  }

  /**
   * Gets all elevation layers in this map.
   *
   * @returns the elevation layers
   */
  getElevationLayers() {
    return this.getLayers(l => l.isElevationLayer);
  }

  /**
   * Disposes this map and associated unmanaged resources.
   *
   * Note: By default, layers in this map are not automatically disposed, except when
   * `disposeLayers` is `true`.
   *
   * @param options - Options.
   * @param options -.disposeLayers If true, layers are also disposed.
   */
  dispose(options = {
    disposeLayers: false
  }) {
    // Dispose all tiles so that every layer will unload data relevant to those tiles.
    this.traverseTiles(t => this.disposeTile(t));
    if (options.disposeLayers === true) {
      this.getLayers().forEach(layer => layer.dispose());
    }
    this._materialOptions.colorMapAtlas?.dispose();
  }
  disposeTile(tile) {
    tile.traverseTiles(desc => {
      desc.dispose();
      this._allTiles.delete(desc);
    });
  }

  /**
   * Gets the elevation range of visible tiles, or `null` if no tile is visible.
   *
   * If there are no elevation layers on this map, returns `null` as well.
   */
  getElevationMinMaxForVisibleTiles() {
    if (!this._hasElevationLayer) {
      return null;
    }
    let min = +Infinity;
    let max = -Infinity;
    this.traverseTiles(tile => {
      if (tile.visible && tile.material.visible) {
        min = Math.min(min, tile.minmax.min);
        max = Math.max(max, tile.minmax.max);
      }
    });
    if (isFinite(min) && isFinite(max)) {
      return {
        min,
        max
      };
    }
    return null;
  }

  /**
   * Returns the minimal and maximal elevation values in this map, in meters.
   *
   * If there is no elevation layer present, returns `{ min: 0, max: 0 }`.
   *
   * @returns The min/max value.
   */
  getElevationMinMax() {
    const elevationLayers = this.getElevationLayers();
    if (elevationLayers.length > 0) {
      let min = null;
      let max = null;
      for (const layer of elevationLayers) {
        const minmax = layer.minmax;
        if (layer.visible && minmax != null) {
          if (min == null || max == null) {
            min = min ?? minmax.min;
            max = max ?? minmax.max;
          } else {
            min = Math.min(min, minmax.min);
            max = Math.max(max, minmax.max);
          }
        }
      }
      if (min != null && max != null) {
        return {
          min,
          max
        };
      }
    }
    return {
      min: 0,
      max: 0
    };
  }

  /**
   * Sample the elevation at the specified coordinate.
   *
   * Note: this method does nothing if no elevation layer is present on the map, or if the
   * sampling coordinate is not inside the map's extent.
   *
   * Note: sampling might return more than one sample for any given coordinate. You can sort them
   * by {@link entities.ElevationSample.resolution | resolution} to select the best sample for your needs.
   * @param options - The options.
   * @param result - The result object to populate with the samples. If none is provided, a new
   * empty result is created. The existing samples in the array are not removed. Useful to
   * cumulate samples across different maps.
   * @returns The {@link GetElevationResult} containing the updated sample array.
   * If the map has no elevation layer, this array is left untouched.
   */
  getElevation(options, result = {
    samples: [],
    coordinates: options.coordinates
  }) {
    result.coordinates = options.coordinates;
    const coordinates = options.coordinates.as(this.extent.crs);
    if (!this.extent.isPointInside(coordinates)) {
      return result;
    }
    if (!this._hasElevationLayer) {
      return result;
    }
    const elevationLayer = this.getElevationLayers()[0];
    if (!elevationLayer.visible) {
      return result;
    }
    this.traverseTiles(tile => {
      if (tile.extent.isPointInside(coordinates)) {
        const sample = tile.getElevation(options);
        if (sample) {
          result.samples.push({
            ...sample,
            source: this
          });
        }
      }
    });
    return result;
  }

  /**
   * Traverses all tiles in the hierarchy of this entity.
   *
   * @param callback - The callback.
   * @param root - The raversal root. If undefined, the traversal starts at the root
   * object of this entity.
   */
  traverseTiles(callback, root = undefined) {
    const origin = root ?? this.object3d;
    let cached = this._cachedTraversals.get(origin);
    if (cached == null) {
      cached = [];
      origin.traverse(o => {
        if (isTileMesh(o)) {
          callback(o);
          cached?.push(o);
        }
      });
      this._cachedTraversals.set(origin, cached);
    } else {
      for (let i = 0; i < cached.length; i++) {
        callback(cached[i]);
      }
    }
  }
  testTileSSE(tile, sse) {
    if (this.maxSubdivisionLevel <= tile.lod) {
      return false;
    }
    if (!sse) {
      return true;
    }
    tmpSseSizes[0] = sse.lengths.x * sse.ratio;
    tmpSseSizes[1] = sse.lengths.y * sse.ratio;
    const {
      width,
      height
    } = tile.textureSize;
    const threshold = Math.max(width, height);
    return tmpSseSizes.some(v => v >= threshold * this.subdivisionThreshold);
  }
  shouldSubdivide(context, node) {
    const worldBox = node.getWorldSpaceBoundingBox(tmpBox3);
    const size = worldBox.getSize(tmpVector);
    const geometricError = Math.max(size.x, size.y);
    const sse = ScreenSpaceError.computeFromBox3(context.view, worldBox, IDENTITY, geometricError, ScreenSpaceError.Mode.MODE_2D);
    return this.testTileSSE(node, sse);
  }
  updateMinMaxDistance(context, node) {
    const bbox = node.getWorldSpaceBoundingBox(tmpBox3);
    const distance = context.distance.plane.distanceToPoint(bbox.getCenter(tmpVector));
    const radius = bbox.getSize(tmpVector).length() * 0.5;
    const MAX_DISTANCE = 1_000_000_000;
    this._distance.min = MathUtils.clamp(Math.min(this._distance.min, distance - radius), 0.5, MAX_DISTANCE);
    this._distance.max = MathUtils.clamp(Math.max(this._distance.max, distance + radius), this._distance.min, MAX_DISTANCE);
  }

  /**
   * Returns a {@link PointOfView} that looks at the map from the top.
   */
  getDefaultPointOfView(params) {
    const target = this.extent.centerAsVector3();
    const minmax = this.getElevationMinMax();

    // Let's put the target at the mid-height of the volume.
    target.setZ(MathUtils.lerp(minmax.min, minmax.max, 0.5));
    const extentDims = this.extent.dimensions(tempDims);
    const maxSize = Math.max(extentDims.width, extentDims.height);
    const radius = 1.2 * (maxSize / 2);
    let orthographicZoom = 1;
    const camera = params.camera;
    let distance;
    if (isOrthographicCamera(camera)) {
      orthographicZoom = computeZoomToFitSphere(camera, radius);
      // In orthographic camera, the actual distance has no effect on the size
      // of objects, but it does have an effect on clipping planes.
      // Let's compute a reasonable distance to put the camera.
      distance = minmax.max + radius;
    } else if (isPerspectiveCamera(camera)) {
      distance = computeDistanceToFitSphere(camera, radius) + minmax.max;
    } else {
      return null;
    }

    // To avoid a perfectly vertical camera axis that would cause a gimbal lock.

    const origin = new Vector3(target.x, target.y - 0.01, distance);
    this.object3d.updateMatrixWorld(true);
    origin.applyMatrix4(this.object3d.matrixWorld);
    target.applyMatrix4(this.object3d.matrixWorld);
    const result = {
      origin,
      target,
      orthographicZoom
    };
    return Object.freeze(result);
  }
}
export function isMap(o) {
  return o?.isMap;
}
export default Map;