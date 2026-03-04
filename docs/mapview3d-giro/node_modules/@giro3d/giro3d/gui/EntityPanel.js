/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */

import { isEntity3D } from '../entities/Entity3D';
import AtmosphereInspector from './AtmosphereInspector';
import AxisGridInspector from './AxisGridInspector';
import FeatureCollectionInspector from './FeatureCollectionInspector';
import GlowInspector from './GlowInspector';
import MapInspector from './MapInspector';
import OrientedImageCollectionInspector from './OrientedImageCollectionInspector';
import Panel from './Panel';
import PointCloudInspector from './PointCloudInspector';
import ShapeInspector from './ShapeInspector';
import SkyDomeInspector from './SkyDomeInspector';
import Tiles3DInspector from './Tiles3DInspector';
const customInspectors = {
  Map: MapInspector,
  Globe: MapInspector,
  Tiles3D: Tiles3DInspector,
  SphericalPanorama: MapInspector,
  AxisGrid: AxisGridInspector,
  Shape: ShapeInspector,
  FeatureCollection: FeatureCollectionInspector,
  PointCloud: PointCloudInspector,
  Atmosphere: AtmosphereInspector,
  SkyDome: SkyDomeInspector,
  Glow: GlowInspector,
  OrientedImageCollection: OrientedImageCollectionInspector
};

/**
 * Provides an inspector for the entities in an instance.
 * To add a custom inspector for a specific entity type,
 * use {@link registerInspector}.
 *
 */
class EntityPanel extends Panel {
  /**
   * @param gui - The GUI.
   * @param instance - The Giro3D instance.
   */
  constructor(gui, instance) {
    super(gui, instance, 'Entities');
    this.instance.addEventListener('update-start', () => this.update());

    // rebuild the inspectors when the instance is updated
    this._createInspectorsCb = () => this.createInspectors();
    this.instance.addEventListener('entity-added', this._createInspectorsCb);
    this.instance.addEventListener('entity-removed', this._createInspectorsCb);
    this.folders = [];
    this.inspectors = [];
    this.createInspectors();
  }
  dispose() {
    this.instance.removeEventListener('update-start', () => this.update());
    this.instance.removeEventListener('entity-added', this._createInspectorsCb);
    this.instance.removeEventListener('entity-removed', this._createInspectorsCb);
    while (this.folders.length > 0) {
      this.folders.pop()?.destroy();
    }
    while (this.inspectors.length > 0) {
      this.inspectors.pop()?.dispose();
    }
  }

  /**
   * Registers an inspector for an entity type.
   *
   * @param type - The entity type. This should match the property `type` on the entity.
   * @param inspector - The inspector.
   * @example
   * EntityPanel.registerInspector('Map', MyCustomMapInspector);
   */
  static registerInspector(type, inspector) {
    customInspectors[type] = inspector;
  }
  update() {
    this.inspectors.forEach(i => i.update());
  }
  createInspectors() {
    while (this.folders.length > 0) {
      this.folders.pop()?.destroy();
    }
    while (this.inspectors.length > 0) {
      this.inspectors.pop()?.dispose();
    }
    this.instance.getObjects(obj => isEntity3D(obj)).forEach(obj => {
      const entity = obj;
      const type = entity.type;
      if (customInspectors[type] != null) {
        const inspector = new customInspectors[type](this.gui, this.instance, entity);
        this.inspectors.push(inspector);
        this.folders.push(inspector.gui);
      } else {
        console.warn(`no inspector found for entity type ${type}`);
      }
    });
  }
}
export default EntityPanel;