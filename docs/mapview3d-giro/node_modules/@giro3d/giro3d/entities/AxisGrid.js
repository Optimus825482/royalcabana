/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */

import { Box3, BufferGeometry, Color, Float32BufferAttribute, Group, Line3, LineBasicMaterial, LineSegments, MathUtils, Sphere, Vector2, Vector3 } from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { getGeometryMemoryUsage } from '../core/MemoryUsage';
import Helpers from '../helpers/Helpers';
import { isBufferGeometry, isCSS2DObject } from '../utils/predicates';
import { nonNull } from '../utils/tsutils';
import Entity3D from './Entity3D';
const mod = MathUtils.euclideanModulo;
const UP = new Vector2(0, 1);
const RIGHT = new Vector2(1, 0);
const tmpVec2 = new Vector2();
const tmpVec3 = new Vector3();
const tmpBl = new Vector2();
const tmpBr = new Vector2();
const tmpTl = new Vector2();
const tmpTr = new Vector2();
const tmp = {
  position: new Vector3(),
  planeNormal: new Vector3(),
  edgeCenter: new Vector3(),
  sideCenter: new Vector3(),
  v2: new Vector2(),
  sphere: new Sphere()
};

/**
 * The grid step values.
 */

/**
 * The grid volume.
 */

/**
 * The grid formatting options.
 */

export const DEFAULT_STYLE = {
  color: new Color('white'),
  fontSize: 10,
  numberFormat: new Intl.NumberFormat()
};

/**
 * Describes the starting point of the ticks.
 */
export let TickOrigin = /*#__PURE__*/function (TickOrigin) {
  /**
   * Tick values represent distances to the grid's lower left corner
   */
  TickOrigin[TickOrigin["Relative"] = 0] = "Relative";
  /**
   * Tick values represent coordinates in the CRS of the scene.
   */
  TickOrigin[TickOrigin["Absolute"] = 1] = "Absolute";
  return TickOrigin;
}({});

/**
 * Returns the padding to apply to a label that is located at the edge of the viewport,
 * according to its normalized device coordinates (NDC), to ensure that the label is fully
 * visible and not partially outside of the viewport.
 */
function getPaddingForAdaptiveLabel(ndc, fontSize, text) {
  const {
    x,
    y
  } = ndc;
  const yMargin = fontSize * 2;
  const xMargin = fontSize * 0.7; // per character

  // top right bottom left
  const top = y > 0.95 ? yMargin : 0;
  const bottom = y < -0.95 ? yMargin : 0;
  const charCount = text.length;
  const right = x > 0.95 ? xMargin * charCount : 0;
  const left = x < -0.95 ? xMargin * charCount : 0;
  return `${top}pt ${right}pt ${bottom}pt ${left}pt`;
}
class Side extends LineSegments {
  logicalVisibility = false;
  constructor(geometry, material, lines) {
    super(geometry, material);
    this.lines = lines;
  }
}
class Edge extends Group {
  isEdge = true;
  constructor(side1, side2) {
    super();
    this.side1 = side1;
    this.side2 = side2;
  }
}
function getCssColor(color) {
  return `#${new Color(color).getHexString()}`;
}
function createLabelElement(text, color, opacity, fontSize) {
  const container = document.createElement('div');

  // Static properties
  container.style.textAlign = 'center';

  // Dynamic properties
  const label = document.createElement('span');
  label.innerText = text;
  label.style.paddingLeft = '5pt';
  label.style.paddingRight = '5pt';
  container.appendChild(label);

  // API exposed properties
  container.style.opacity = `${opacity}`;
  container.style.color = color;
  container.style.fontSize = `${fontSize}pt`;
  return {
    container,
    label
  };
}

/**
 * Constructor options for the {@link AxisGrid} entity.
 */

/**
 * Create a 3D axis grid. This is represented as a box volume where each side of the box is itself a
 * grid.
 *
 * ```js
 * // Create a 200x200 meters extent
 * const extent = new Extent(CoordinateSystem.epsg3857, -100, +100, -100, +100);
 *
 * // Create an AxisGrid on this extent, with the grid floor at zero meters,
 * // and the grid ceiling at 2500 meters.
 * //
 * // Display a tick (grid line), every 10 meters on the horizontal axes,
 * // and every 50 meters on the vertical axis.
 * const grid = new AxisGrid({
 *   volume: {
 *       extent,
 *       floor: 0,
 *       ceiling: 2500,
 *   },
 *   origin: TickOrigin.Relative,
 *   ticks: {
 *       x: 10,
 *       y: 10,
 *       z: 50,
 *   },
 * });
 * ```
 *
 * ## Label customization
 *
 * By registering the `'label-created'` event, you can modify the DOM element for the newly created label:
 *
 * ```js
 * grid.addEventListener('label-created', ({ label }) => label.classList.add('my-custom-css-class'));
 * ```
 */
class AxisGrid extends Entity3D {
  type = 'AxisGrid';
  /**
   * Read-only flag to check if a given object is of type AxisGrid.
   */
  isAxisGrid = true;
  _unitSuffix = '';
  _showLabels = true;
  _adaptiveLabels = false;
  _disposed = false;
  _lastCamera = null;
  _boundingBox = null;
  _dimensions = null;
  _arrowRoot = null;
  _floor = null;
  _ceiling = null;
  _front = null;
  _back = null;
  _left = null;
  _right = null;
  _height = null;
  _midHeight = null;
  _needsRebuild = false;
  /**
   * Creates an instance of AxisGrid.
   *
   * @param options - The options.
   */
  constructor(options) {
    super(options);
    this._root = this.object3d;
    this._edgeLabelRoot = new Group();
    this._edgeLabelRoot.name = 'edge labels';
    this._adaptiveLabelRoot = new Group();
    this._adaptiveLabelRoot.name = 'adaptive labels';
    this._style = {
      color: options.style?.color ?? DEFAULT_STYLE.color,
      fontSize: options.style?.fontSize ?? DEFAULT_STYLE.fontSize,
      numberFormat: options.style?.numberFormat ?? DEFAULT_STYLE.numberFormat
    };
    this._adaptiveLabels = options.adaptiveLabels ?? this._adaptiveLabels;
    this.onObjectCreated(this._edgeLabelRoot);
    this.onObjectCreated(this._adaptiveLabelRoot);
    this._root.add(this._edgeLabelRoot);
    this._root.add(this._adaptiveLabelRoot);
    this._boundingSphere = new Sphere();
    this._boundingBoxCenter = new Vector3();
    if (options.volume == null) {
      throw new Error('options.volume is undefined');
    }
    this._volume = options.volume;
    this._ticks = options.ticks ?? {
      x: 100,
      y: 100,
      z: 100
    };
    this._origin = options.origin ?? TickOrigin.Relative;
    const crs = this.volume.extent.crs;
    const unit = crs.horizontal?.unit;
    if (unit != null) {
      // TODO we should distinguish between horizontal and vertical units ideally.
      this._unitSuffix = unit.getSymbol();
    }
    const color = new Color(this.style.color);
    this._material = new LineBasicMaterial({
      color
    });
    this._cameraForward = new Vector3();
    this._showFloorGrid = true;
    this._showCeilingGrid = true;
    this._showSideGrids = true;
    this.showHelpers = false;
    this.refresh();
  }
  getMemoryUsage(context) {
    this.traverse(obj => {
      if ('geometry' in obj && isBufferGeometry(obj.geometry)) {
        getGeometryMemoryUsage(context, obj.geometry);
      }
    });
  }
  updateOpacity() {
    const v = this.opacity;
    this.forEachLabel(label => label.element.style.opacity = `${v}`);
    const mat = this._material;
    mat.opacity = v;
    mat.transparent = v < 1.0;
    mat.needsUpdate = true;
  }

  /**
   * Gets or sets the style.
   * You will need to call {@link refresh} to recreate the grid.
   */
  get style() {
    return this._style;
  }
  set style(v) {
    if (v === undefined || v === null) {
      throw new Error('cannot assign undefined/null style');
    }
    this._style = v;
  }

  /**
   * Gets or sets the volume.
   * You will need to call {@link refresh} to recreate the grid.
   */
  get volume() {
    return this._volume;
  }
  set volume(v) {
    if (v === undefined || v === null) {
      throw new Error('cannot assign undefined/null volume');
    }
    this._volume = v;
  }

  /**
   * Gets or sets the tick origin.
   * You will need to call {@link refresh} to recreate the grid.
   */
  get origin() {
    return this._origin;
  }
  set origin(v) {
    if (v === undefined || v === null) {
      throw new Error('cannot assign undefined/null origin');
    }
    this._origin = v;
  }

  /**
   * Gets or sets the grid and label color.
   */
  get color() {
    return this.style.color;
  }
  set color(color) {
    this._material.color = new Color(color);
    this.style.color = color;
    this.refresh();
  }

  /**
   * Shows or hides labels.
   */
  get showLabels() {
    return this._showLabels;
  }
  set showLabels(v) {
    if (v !== this._showLabels) {
      this._showLabels = v;
      this._edgeLabelRoot.visible = v;
      this._adaptiveLabelRoot.visible = v;
      this.updateLabelsVisibility(this._lastCamera);
    }
  }

  /**
   * Toggles adaptive labels. Adaptive labels are labels that are displayed
   * at the intersection of their line and the viewport's edges,  so that
   * they remain visible even when the grid sides are out of view.
   */
  get adaptiveLabels() {
    return this._adaptiveLabels;
  }
  set adaptiveLabels(v) {
    if (v !== this._adaptiveLabels) {
      this._adaptiveLabels = v;
      if (!v) {
        this.removeAdaptiveLabels();
      }
      this.notifyChange(this);
    }
  }

  /**
   * Shows or hides the floor grid.
   */
  get showFloorGrid() {
    return this._showFloorGrid;
  }
  set showFloorGrid(v) {
    if (v !== this._showFloorGrid) {
      this._showFloorGrid = v;
      this.updateVisibility();
    }
  }

  /**
   * Shows or hides the ceiling grid.
   */
  get showCeilingGrid() {
    return this._showCeilingGrid;
  }
  set showCeilingGrid(v) {
    if (v !== this._showCeilingGrid) {
      this._showCeilingGrid = v;
      this.updateVisibility();
    }
  }

  /**
   * Shows or hides the side grids.
   */
  get showSideGrids() {
    return this._showSideGrids;
  }
  set showSideGrids(v) {
    if (v !== this._showSideGrids) {
      this._showSideGrids = v;
      this.updateVisibility();
    }
  }

  /**
   * Gets or sets the tick intervals.
   * You will need to call {@link refresh} to recreate the grid.
   */
  get ticks() {
    return this._ticks;
  }
  set ticks(v) {
    if (v === undefined || v === null) {
      throw new Error('cannot assign undefined/null ticks');
    }
    this._ticks = v;
  }
  forEachLabel(callback) {
    this._edgeLabelRoot.traverse(obj => {
      if (isCSS2DObject(obj)) {
        callback(obj);
      }
    });
    this._adaptiveLabelRoot.traverse(obj => {
      if (isCSS2DObject(obj)) {
        callback(obj);
      }
    });
  }

  /**
   * Rebuilds the grid. This is necessary after changing the ticks, volume or origin.
   */
  refresh() {
    this._needsRebuild = true;
  }
  rebuildObjects() {
    this.volume.extent.centerAsVector2(tmpVec2);
    this._root.position.setX(tmpVec2.x);
    this._root.position.setY(tmpVec2.y);
    this.buildSides();
    this.buildEdgeLabels();
    this._root.updateMatrixWorld();
    this._boundingBox = this.volume.extent.toBox3(this.volume.floor, this.volume.ceiling);
    this._boundingBox.getBoundingSphere(this._boundingSphere);
    this._boundingBox.getCenter(this._boundingBoxCenter);
    this.updateVisibility();
  }
  removeEdgeLabels() {
    this._edgeLabelRoot.traverse(obj => {
      if (isCSS2DObject(obj)) {
        obj.element.remove();
      }
    });
    this._edgeLabelRoot.clear();
  }
  removeAdaptiveLabels() {
    this._adaptiveLabelRoot.traverse(obj => {
      if (isCSS2DObject(obj)) {
        obj.element.remove();
      }
    });
    this._adaptiveLabelRoot.clear();
  }
  updateVisibility() {
    super.updateVisibility();
    this.updateLabelsVisibility(this._lastCamera);
  }
  createLabelObject(x, y, z, text, cssColor, opacity, fontSize) {
    const {
      container,
      label
    } = createLabelElement(text, cssColor, opacity, fontSize);
    this.dispatchEvent({
      type: 'label-created',
      label
    });
    const labelObject = new CSS2DObject(container);
    labelObject.name = text;
    labelObject.position.set(x, y, z);
    return labelObject;
  }
  buildEdgeLabels() {
    // Labels are displayed along each edge of the box volume.
    // There are 12 edges in a box, and those edges are linked to their two sides.

    const labelRoot = this._edgeLabelRoot;
    this.removeEdgeLabels();
    const numberFormat = this.style.numberFormat;
    const cssColor = getCssColor(this.style.color);
    const opacity = this.opacity;
    const fontSize = this.style.fontSize;
    const v = new Vector3();
    this.volume.extent.centerAsVector2(tmpVec2);
    const origin = tmpVec3;
    tmpVec3.set(tmpVec2.x, tmpVec2.y, 0);

    /**
     * @param side1 - The first shared side of this edge.
     * @param side2 - The second shared side of this edge.
     * @param start -  The position, in world space, of the start of the edge.
     * @param end - The position, in world space, of the end of the edge.
     * @param startValue - The numerical value of the starting point.
     * @param prefix - The prefix to apply to the label text.
     * @param suffix - The suffix to apply to the label text.
     * @param tick - The distance between each tick.
     */
    const createLabelsAlongEdge = (side1, side2, start, end, startValue, prefix, suffix, tick) => {
      const g = new Edge(side1, side2);
      g.name = `${side1.name}-${side2.name}`;
      const edgeCenter = v.lerpVectors(start, end, 0.5).clone();
      edgeCenter.sub(origin);
      g.position.copy(edgeCenter);
      const sideLength = start.distanceTo(end);
      let labelDistance = 0;
      let t = (tick - mod(startValue + tick, tick)) / sideLength;

      // Distribute the labels along the edge, on each tick
      do {
        v.lerpVectors(start, end, t);
        labelDistance = v.distanceTo(start);
        const rawValue = startValue + labelDistance;
        const labelValue = numberFormat.format(Math.round(rawValue));
        const label = this.createLabelObject(v.x - edgeCenter.x - origin.x, v.y - edgeCenter.y - origin.y, v.z - edgeCenter.z - origin.z, `${prefix}${labelValue}${suffix}`, cssColor, opacity, fontSize);
        g.add(label);
        t += tick / sideLength;
      } while (t <= 1);
      this.onObjectCreated(g);
      labelRoot.add(g);
    };
    const e = this.volume.extent;
    const zmax = this.volume.ceiling;
    const zmin = this.volume.floor;
    const br = e.bottomRight().toVector2(tmpBr);
    const tr = e.topRight().toVector2(tmpTr);
    const bl = e.bottomLeft().toVector2(tmpBl);
    const tl = e.topLeft().toVector2(tmpTl);
    const tlFloor = new Vector3(tl.x, tl.y, zmin);
    const trFloor = new Vector3(tr.x, tr.y, zmin);
    const brFloor = new Vector3(br.x, br.y, zmin);
    const blFloor = new Vector3(bl.x, bl.y, zmin);
    const tlCeil = new Vector3(tl.x, tl.y, zmax);
    const trCeil = new Vector3(tr.x, tr.y, zmax);
    const brCeil = new Vector3(br.x, br.y, zmax);
    const blCeil = new Vector3(bl.x, bl.y, zmax);
    const floor = nonNull(this._floor);
    const ceil = nonNull(this._ceiling);
    const front = nonNull(this._front);
    const back = nonNull(this._back);
    const left = nonNull(this._left);
    const right = nonNull(this._right);
    const relative = this.origin === TickOrigin.Relative;
    const bry = relative ? 0 : br.y;
    const blx = relative ? 0 : bl.x;
    const tlx = relative ? 0 : tl.x;
    const yPrefix = relative ? '' : 'y: ';
    const xPrefix = relative ? '' : 'x: ';
    const zPrefix = '';
    const hSuffix = relative ? this._unitSuffix : '';
    const vSuffix = this._unitSuffix;

    // floor edges
    createLabelsAlongEdge(floor, right, brFloor, trFloor, bry, yPrefix, hSuffix, this._ticks.y);
    createLabelsAlongEdge(floor, left, blFloor, tlFloor, bry, yPrefix, hSuffix, this._ticks.y);
    createLabelsAlongEdge(floor, front, blFloor, brFloor, blx, xPrefix, hSuffix, this._ticks.x);
    createLabelsAlongEdge(floor, back, tlFloor, trFloor, tlx, xPrefix, hSuffix, this._ticks.x);

    // ceiling edges
    createLabelsAlongEdge(ceil, right, brCeil, trCeil, bry, yPrefix, hSuffix, this._ticks.y);
    createLabelsAlongEdge(ceil, left, blCeil, tlCeil, bry, yPrefix, hSuffix, this._ticks.y);
    createLabelsAlongEdge(ceil, front, blCeil, brCeil, blx, xPrefix, hSuffix, this._ticks.x);
    createLabelsAlongEdge(ceil, back, tlCeil, trCeil, tlx, xPrefix, hSuffix, this._ticks.x);

    // vertical (elevation) edges
    createLabelsAlongEdge(front, right, brFloor, brCeil, zmin, zPrefix, vSuffix, this._ticks.z);
    createLabelsAlongEdge(front, left, blFloor, blCeil, zmin, zPrefix, vSuffix, this._ticks.z);
    createLabelsAlongEdge(back, left, tlFloor, tlCeil, zmin, zPrefix, vSuffix, this._ticks.z);
    createLabelsAlongEdge(back, right, trFloor, trCeil, zmin, zPrefix, vSuffix, this._ticks.z);
  }

  /**
   * Build adaptive labels: labels that are located at the intersections
   * of lines and the viewport edges. They are adaptive because their
   * position depends on the camera.
   * Note: if no line intersects any viewport edge, then no adaptive label is created.
   */
  buildAdaptiveLabels(view) {
    this.removeAdaptiveLabels();
    const numberFormat = this.style.numberFormat;
    const cssColor = getCssColor(this.style.color);
    const opacity = this.opacity;
    const fontSize = this.style.fontSize;
    const relative = this.origin === TickOrigin.Relative;
    const yPrefix = relative ? '' : 'y: ';
    const xPrefix = relative ? '' : 'x: ';
    const hSuffix = relative ? this._unitSuffix : '';
    const vSuffix = this._unitSuffix;
    const dimensions = this.volume.extent.dimensions(tmpVec2);
    let xOrigin = 0;
    let yOrigin = 0;
    let zOrigin = 0;
    if (relative) {
      xOrigin = 0;
      yOrigin = 0;
      zOrigin = this.volume.floor;
    } else {
      xOrigin = this.object3d.position.x - dimensions.x / 2;
      yOrigin = this.object3d.position.y - dimensions.y / 2;
      zOrigin = this.object3d.position.z - (this.volume.ceiling - this.volume.floor) / 2;
    }
    const frustum = view.frustum;
    const intersect = new Vector3();
    const line = new Line3();
    const marginBox = new Box3();
    const marginBoxSize = new Vector3(1, 1, 1);
    const createLabelsForSide = side => {
      if (!side.visible) {
        return;
      }
      const matrix = side.matrixWorld;
      for (let i = 0; i < side.lines.length; i++) {
        const l = side.lines[i];
        let prefix = '';
        let suffix = '';
        let offset = 0;
        switch (l.axis) {
          case 'X':
            prefix = xPrefix;
            suffix = hSuffix;
            offset = xOrigin;
            break;
          case 'Y':
            prefix = yPrefix;
            suffix = hSuffix;
            offset = yOrigin;
            break;
          case 'Z':
            prefix = '';
            suffix = vSuffix;
            offset = zOrigin;
            break;
        }

        // The original line has local coordinates.
        line.start.copy(l.start).applyMatrix4(matrix);
        line.end.copy(l.end).applyMatrix4(matrix);
        const rawValue = l.labelValue + offset;
        const labelValue = numberFormat.format(Math.round(rawValue));
        const text = `${prefix}${labelValue}${suffix}`;

        // Let's create labels that are located at the edge of the viewport.
        // For each plane in the frustum, we will check if the line that this label
        // belongs to intersects with the plane. If so, then we then make sure that the
        // label is actually inside the frustum by using a small box rather than a point
        // to reduce false negatives.
        for (const plane of frustum.planes) {
          if (plane.intersectLine(line, intersect) != null && frustum.intersectsBox(marginBox.setFromCenterAndSize(intersect, marginBoxSize)) === true) {
            const position = intersect;
            const label = this.createLabelObject(position.x, position.y, position.z, text, cssColor, opacity, fontSize);
            const ndc = position.project(view.camera);

            // Finally, to ensure that the label is correctly inside the viewport,
            // we adjust its padding depending on the viewport edge. e.g: if the
            // label is on the upper edge, we pad on the top so that it moves down.
            label.element.style.padding = getPaddingForAdaptiveLabel(ndc, fontSize, text);
            this._adaptiveLabelRoot.attach(label);
          }
        }
      }
    };
    const floor = nonNull(this._floor);
    const ceil = nonNull(this._ceiling);
    const front = nonNull(this._front);
    const back = nonNull(this._back);
    const left = nonNull(this._left);
    const right = nonNull(this._right);
    createLabelsForSide(floor);
    createLabelsForSide(ceil);
    createLabelsForSide(front);
    createLabelsForSide(back);
    createLabelsForSide(left);
    createLabelsForSide(right);
    this._edgeLabelRoot.updateMatrixWorld(true);
  }
  deleteSides() {
    const root = this._root;
    function remove(obj) {
      if (obj) {
        obj.geometry.dispose();
        root.remove(obj);
      }
    }
    remove(this._floor);
    remove(this._ceiling);
    remove(this._front);
    remove(this._back);
    remove(this._left);
    remove(this._right);
  }
  buildSides() {
    this._dimensions = this.volume.extent.dimensions();
    this._height = Math.abs(this.volume.ceiling - this.volume.floor);
    this._midHeight = this.volume.floor + this._height / 2;
    const xSize = this._dimensions.x;
    const ySize = this._dimensions.y;
    const zSize = this._height;
    const extent = this.volume.extent;
    const relative = this.origin === TickOrigin.Relative;
    const xStart = relative ? 0 : this._ticks.x - mod(extent.west, this._ticks.x);
    const yStart = relative ? 0 : this._ticks.y - mod(extent.south, this._ticks.y);
    const zStart = this._ticks.z - mod(this.volume.floor, this._ticks.z);
    const xMin = xStart;
    const xMax = xMin + xSize;
    const yMin = yStart;
    const yMax = yMin + ySize;
    const zMin = this.volume.floor;
    const zMax = zMin + zSize;
    this.deleteSides();
    this._floor = this.buildSide({
      name: 'floor',
      horizontalLineAxis: 'X',
      verticalLineAxis: 'Y',
      width: xSize,
      height: ySize,
      xMin,
      xMax,
      yMin,
      yMax,
      xOffset: xStart,
      xStep: this._ticks.x,
      yOffset: yStart,
      yStep: this._ticks.y
    });
    this._ceiling = this.buildSide({
      name: 'ceiling',
      horizontalLineAxis: 'X',
      verticalLineAxis: 'Y',
      width: xSize,
      height: ySize,
      xMin,
      xMax,
      yMin,
      yMax,
      xOffset: xStart,
      xStep: this._ticks.x,
      yOffset: yStart,
      yStep: this._ticks.y
    });
    this._front = this.buildSide({
      name: 'front',
      horizontalLineAxis: 'X',
      verticalLineAxis: 'Z',
      width: xSize,
      height: zSize,
      xMin,
      xMax,
      yMin: zMin,
      yMax: zMax,
      xOffset: xStart,
      xStep: this._ticks.x,
      yOffset: zStart,
      yStep: this._ticks.z
    });
    this._back = this.buildSide({
      name: 'back',
      horizontalLineAxis: 'X',
      verticalLineAxis: 'Z',
      width: xSize,
      height: zSize,
      xMin,
      xMax,
      yMin: zMin,
      yMax: zMax,
      xOffset: xStart,
      xStep: this._ticks.x,
      yOffset: zStart,
      yStep: this._ticks.z
    });
    this._left = this.buildSide({
      name: 'left',
      horizontalLineAxis: 'Y',
      verticalLineAxis: 'Z',
      width: ySize,
      height: zSize,
      xMin: yMin,
      xMax: yMax,
      yMin: zMin,
      yMax: zMax,
      xOffset: yStart,
      xStep: this._ticks.y,
      yOffset: zStart,
      yStep: this._ticks.z
    });
    this._right = this.buildSide({
      name: 'right',
      horizontalLineAxis: 'Y',
      verticalLineAxis: 'Z',
      width: ySize,
      height: zSize,
      xMin: yMin,
      xMax: yMax,
      yMin: zMin,
      yMax: zMax,
      xOffset: yStart,
      xStep: this._ticks.y,
      yOffset: zStart,
      yStep: this._ticks.z
    });

    // Since the root group is located at the extent's center,
    // all subsequent transformations are local to this point.
    this._front.rotateX(MathUtils.degToRad(90));
    this._front.position.set(0, -this._dimensions.y / 2, this._midHeight);
    this._back.scale.setZ(-1);
    this._back.rotateX(MathUtils.degToRad(90));
    this._back.position.set(0, +this._dimensions.y / 2, this._midHeight);
    this._right.rotateX(MathUtils.degToRad(90));
    this._right.rotateY(MathUtils.degToRad(90));
    this._right.position.set(+this._dimensions.x / 2, 0, this._midHeight);
    this._left.scale.setZ(-1);
    this._left.rotateX(MathUtils.degToRad(90));
    this._left.rotateY(MathUtils.degToRad(90));
    this._left.position.set(-this._dimensions.x / 2, 0, this._midHeight);
    this._ceiling.position.set(0, 0, this.volume.ceiling);
    this._floor.position.set(0, 0, this.volume.floor);
    this._floor.scale.setZ(-1);
    this.onObjectCreated(this._back);
    this.onObjectCreated(this._left);
    this.onObjectCreated(this._right);
    this.onObjectCreated(this._front);
    this.onObjectCreated(this._floor);
    this.onObjectCreated(this._ceiling);
    this._root.add(this._back);
    this._root.add(this._left);
    this._root.add(this._right);
    this._root.add(this._front);
    this._root.add(this._floor);
    this._root.add(this._ceiling);
  }

  /**
   * @param name - The name of the object.
   * @param width - The width of the plane.
   * @param height - The height of the plane.
   * @param xOffset - The starting offset on the X axis.
   * @param xStep - The distance between lines on the X axis.
   * @param yOffset - The starting offset on the Y axis.
   * @param yStep - The distance between lines on the Y axis.
   * @returns the mesh object.
   */
  buildSide(params) {
    const {
      name,
      horizontalLineAxis,
      verticalLineAxis,
      width,
      height,
      xMin,
      xMax,
      yMin,
      yMax,
      xOffset,
      xStep,
      yOffset,
      yStep
    } = params;
    const vertices = [];
    const centerX = width / 2;
    const centerY = height / 2;
    let x = xOffset;
    let y = yOffset;
    const top = height;
    const bottom = 0;
    const left = 0;
    const right = width;
    const lines = [];
    function pushSegment(x0, y0, x1, y1, labelValue, axis) {
      const start = new Vector3(x0 - centerX, y0 - centerY, 0);
      const end = new Vector3(x1 - centerX, y1 - centerY, 0);
      vertices.push(start.x, start.y, start.z);
      vertices.push(end.x, end.y, end.z);
      const line = new Line3(start, end);
      line.labelValue = labelValue;
      line.axis = axis;
      lines.push(line);
    }

    // Vertical boundary lines
    pushSegment(left, bottom, left, top, xMin, verticalLineAxis);
    pushSegment(right, bottom, right, top, xMax, verticalLineAxis);

    // Horizontal boundary lines
    pushSegment(left, bottom, right, bottom, yMin, horizontalLineAxis);
    pushSegment(left, top, right, top, yMax, horizontalLineAxis);

    // Horizontal subdivisions
    while (x < right) {
      // Avoid duplicating the boundary line
      if (x !== left) {
        pushSegment(x, bottom, x, top, x, horizontalLineAxis);
      }
      x += xStep;
    }

    // Vertical subdivisions
    while (y < top) {
      // Avoid duplicating the boundary line
      if (y !== bottom) {
        pushSegment(left, y, right, y, y, verticalLineAxis);
      }
      y += yStep;
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    const mesh = new Side(geometry, this._material, lines);
    this.onObjectCreated(mesh);
    mesh.name = name;
    return mesh;
  }
  makeArrowHelper(start, end) {
    if (!this._arrowRoot) {
      this._arrowRoot = new Group();
      this.onObjectCreated(this._arrowRoot);
      nonNull(this._root.parent).add(this._arrowRoot);
    }
    const arrow = Helpers.createArrow(start.clone(), end.clone());
    this.onObjectCreated(arrow);
    this._arrowRoot.add(arrow);
    arrow.updateMatrixWorld();
    const startPoint = Helpers.createAxes(250);
    startPoint.position.copy(start);
    this.onObjectCreated(startPoint);
    this._arrowRoot.add(startPoint);
    startPoint.updateMatrixWorld(true);
    const endPoint = Helpers.createAxes(250);
    endPoint.position.copy(end);
    this.onObjectCreated(endPoint);
    this._arrowRoot.add(endPoint);
    endPoint.updateMatrixWorld(true);
  }
  updateLabelsVisibility(camera) {
    this._lastCamera = camera;
    this.deleteArrowHelpers();
    if (camera) {
      this._edgeLabelRoot.children.forEach(o => this.updateLabelEdgeVisibility(camera, o));
    }
  }
  deleteArrowHelpers() {
    if (this._arrowRoot) {
      const children = [...this._arrowRoot.children];
      for (const child of children) {
        child.removeFromParent();
      }
    }
  }
  updateLabelEdgeVisibility(camera, edge) {
    if (!edge.isEdge) {
      return;
    }
    const rootVisible = this.object3d.visible && this._edgeLabelRoot.visible;
    const fontSize = this.style.fontSize;

    // Labels on an edge should be displayed only if one of their side is visible,
    // to prevent labels getting in the way.
    //
    // However, since the API enables overriding ceiling, floor or side grids visibility,
    // we must distinguish between the logical visibility of the side (aka computed from the
    // camera angle), and the final visibility, that also includes the API overrides.
    //
    // Note: HTML labels are not automatically hidden when their parent is hidden, because
    // they are not really part of the scene graph, so they must be updated accordingly.
    //
    const logicalVisibility = edge.side1.logicalVisibility !== edge.side2.logicalVisibility;
    const graphicalVisibility = edge.side1.visible || edge.side2.visible;
    const visible = logicalVisibility && graphicalVisibility && rootVisible;
    edge.visible = visible;
    let paddingTop = 0;
    let paddingBottom = 0;
    let paddingRight = 0;
    let paddingLeft = 0;
    if (visible) {
      // Now that we know this label edge is visible, we can compute the
      // offset to apply (in the form of padding) to the labels so they don't overlap
      // their edge line (for greater readability). We want to push the labels "outside"
      // the grid. Since labels are 2D elements in the DOM, we cannot simply move
      // the 3D objects around.
      //
      // To compute the vertical and horizontal paddings for the label in an edge,
      // we must first compute the vector from the center of the grid volume toward the center
      // of the label edge.
      //
      // Then project this vector on the screen, so that we can reason in the same
      // coordinate system than the DOM.
      //
      // Then we can establish a quadrant to know the padding. For example, if the vector
      // is pointing to the lower left corner of the screen, we know that the label must
      // be pushed in this direction, so that we apply padding accordingly.

      tmp.edgeCenter.set(0, 0, 0);
      const edgeCenter = edge.localToWorld(tmp.edgeCenter);
      const boxCenter = this._boundingBoxCenter.clone();
      if (this.showHelpers) {
        this.makeArrowHelper(boxCenter, edgeCenter);
      }
      edgeCenter.project(camera);
      boxCenter.project(camera);
      const clipVector = edgeCenter.sub(boxCenter);
      // Our screenvector is in clip space, which is still a 3D space
      // We need a purely screen-space vector.
      const screenVector = tmp.v2.set(clipVector.x, clipVector.y).normalize();
      const vQuadrant = UP.dot(screenVector);
      const hQuadrant = RIGHT.dot(screenVector);
      const zero = 0;
      const limit = 0;
      const yMargin = fontSize * 2;
      const xMargin = fontSize * 0.7; // per character

      if (vQuadrant > limit) {
        paddingBottom = yMargin;
        paddingTop = zero;
      } else {
        paddingBottom = zero;
        paddingTop = yMargin;
      }
      if (hQuadrant > limit) {
        paddingLeft = xMargin;
        paddingRight = zero;
      } else {
        paddingLeft = zero;
        paddingRight = xMargin;
      }
    }
    const showHelpers = this.showHelpers;
    edge.traverse(c => {
      if (isCSS2DObject(c) && c.element != null) {
        c.visible = visible;
        if (visible) {
          const style = c.element.style;
          style.paddingTop = `${paddingTop}pt`;
          style.paddingBottom = `${paddingBottom}pt`;
          const charCount = c.element.innerText?.length ?? 1;
          style.paddingRight = `${paddingRight * charCount}pt`;
          style.paddingLeft = `${paddingLeft * charCount}pt`;
          if (showHelpers) {
            style.backgroundColor = 'rgba(0, 255, 0, 0.2)';
          }
        }
      }
    });
  }
  updateSidesVisibility(camera) {
    function updateSideVisibility(side, sideVisibility, cameraNormal) {
      tmp.planeNormal.setFromMatrixColumn(side.matrixWorld, 2);
      // The reason why we distinguish between two kinds of visibility is because
      // label visibility rules must take into account the fact that the API
      // allows to manually hide the ceiling, floor, or side grids.
      // Without that, we would have labels displayed when they should not.
      side.logicalVisibility = cameraNormal.dot(tmp.planeNormal) < -0.1;
      side.visible = sideVisibility && side.logicalVisibility;
    }

    // Only display sides that are facing toward the camera
    updateSideVisibility(nonNull(this._front), this._showSideGrids, this._cameraForward);
    updateSideVisibility(nonNull(this._back), this._showSideGrids, this._cameraForward);
    updateSideVisibility(nonNull(this._right), this._showSideGrids, this._cameraForward);
    updateSideVisibility(nonNull(this._left), this._showSideGrids, this._cameraForward);
    updateSideVisibility(nonNull(this._ceiling), this._showCeilingGrid, this._cameraForward);
    updateSideVisibility(nonNull(this._floor), this._showFloorGrid, this._cameraForward);
    this.updateLabelsVisibility(camera);
  }
  preUpdate(context) {
    if (!this.visible) {
      return [];
    }
    if (this._needsRebuild) {
      this.rebuildObjects();
      this._needsRebuild = false;
    }
    const camera = context.view.camera;
    this._cameraForward.setFromMatrixColumn(camera.matrixWorld, 2);
    this.updateSidesVisibility(camera);
    if (this._adaptiveLabels) {
      this.buildAdaptiveLabels(context.view);
    }
    this.updateMinMaxDistance(context);
    return [];
  }
  updateMinMaxDistance(context) {
    const cameraPos = context.view.camera.position;
    const centerDistance = this._boundingSphere.center.distanceTo(cameraPos);
    const radius = this._boundingSphere.radius;
    this._distance.min = centerDistance - radius;
    this._distance.max = centerDistance + radius;
  }
  dispose() {
    if (this._disposed) {
      return;
    }
    this._disposed = true;
    this._material.dispose();
    this.removeEdgeLabels();
    this.deleteSides();
    this.deleteArrowHelpers();
  }
}
export default AxisGrid;