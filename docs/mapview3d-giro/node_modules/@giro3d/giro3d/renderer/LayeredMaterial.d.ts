/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import type { ColorRepresentation, IUniform, Light, Side, Texture, TextureDataType, WebGLProgramParametersWithUniforms, WebGLRenderer } from 'three';
import { Color, ShaderMaterial, UniformsLib, Vector2, Vector3, Vector4 } from 'three';
import type ColorimetryOptions from '../core/ColorimetryOptions';
import type ColorMapMode from '../core/ColorMapMode';
import type ContourLineOptions from '../core/ContourLineOptions';
import type ElevationRange from '../core/ElevationRange';
import type Extent from '../core/geographic/Extent';
import type GraticuleOptions from '../core/GraticuleOptions';
import type ColorLayer from '../core/layer/ColorLayer';
import type ElevationLayer from '../core/layer/ElevationLayer';
import type Layer from '../core/layer/Layer';
import type { TextureAndPitch } from '../core/layer/Layer';
import type { MaskMode } from '../core/layer/MaskLayer';
import type MemoryUsage from '../core/MemoryUsage';
import type TerrainOptions from '../core/TerrainOptions';
import type MapLightingOptions from '../entities/MapLightingOptions';
import type ColorMapAtlas from './ColorMapAtlas';
import BlendingMode from '../core/layer/BlendingMode';
import { type GetMemoryUsageContext } from '../core/MemoryUsage';
import OffsetScale from '../core/OffsetScale';
import WebGLComposer from './composition/WebGLComposer';
import RenderingState from './RenderingState';
export declare const DEFAULT_OUTLINE_COLOR = "red";
export declare const DEFAULT_HILLSHADING_INTENSITY = 1;
export declare const DEFAULT_HILLSHADING_ZFACTOR = 1;
export declare const DEFAULT_AZIMUTH = 135;
export declare const DEFAULT_ZENITH = 45;
export declare const DEFAULT_GRATICULE_COLOR: Color;
export declare const DEFAULT_GRATICULE_STEP = 500;
export declare const DEFAULT_GRATICULE_THICKNESS = 1;
export declare const DEFAULT_SUN_DIRECTION: Vector3;
export interface MaterialOptions {
    /**
     * Discards no-data pixels.
     */
    discardNoData: boolean;
    /**
     * Geometric terrain options.
     */
    terrain: Required<TerrainOptions>;
    /**
     * Colorimetry options for the entire material.
     */
    colorimetry: Required<ColorimetryOptions>;
    /**
     * The sidedness.
     */
    side: Side;
    /**
     * Contour lines options.
     */
    contourLines: Required<ContourLineOptions>;
    /**
     * Lighting options.
     */
    lighting: Required<MapLightingOptions>;
    /**
     * Graticule options.
     */
    graticule: Required<GraticuleOptions>;
    /**
     * The elevation range.
     */
    elevationRange: {
        min: number;
        max: number;
    } | null;
    /**
     * The colormap atlas.
     */
    colorMapAtlas: ColorMapAtlas | null;
    /**
     * The background color.
     */
    backgroundColor: Color;
    /**
     * The background opacity.
     */
    backgroundOpacity: number;
    /**
     * Show the outlines of tile meshes.
     */
    showTileOutlines: boolean;
    /**
     * The tile outline color.
     * @defaultValue {@link DEFAULT_OUTLINE_COLOR}
     */
    tileOutlineColor: Color;
    /**
     * Force using texture atlases even when not required by WebGL limitations.
     */
    forceTextureAtlases: boolean;
    /**
     * Displays the collider meshes used for raycast.
     */
    showColliderMeshes: boolean;
    /**
     * Displays the bounding boxes of tiles.
     */
    showBoundingBoxes: boolean;
    /**
     * Displays the bounding spheres of tiles.
     */
    showBoundingSpheres: boolean;
    helperColor: ColorRepresentation;
    depthTest: boolean;
}
declare enum InternalShadingMode {
    Disabled = 0,
    Simple = 1,
    Realistic = 2
}
interface HillshadingUniform {
    mode: InternalShadingMode;
    intensity: number;
    zFactor: number;
    zenith: number;
    azimuth: number;
}
interface ContourLineUniform {
    thickness: number;
    primaryInterval: number;
    secondaryInterval: number;
    color: Vector4;
}
interface GraticuleUniform {
    thickness: number;
    /** xOffset, yOffset, xStep, yStep */
    position: Vector4;
    color: Vector4;
}
interface LayerUniform {
    offsetScale: Vector4;
    color: Vector4;
    textureSize: Vector2;
    elevationRange: Vector2;
    brightnessContrastSaturation: Vector3;
    mode: 0 | MaskMode;
    blendingMode: BlendingMode;
}
interface NeighbourUniform {
    offsetScale: Vector4 | null;
    diffLevel: number;
}
interface ColorMapUniform {
    mode: ColorMapMode | 0;
    min: number;
    max: number;
    offset: number;
}
interface Defines extends Record<string, unknown> {
    ENABLE_CONTOUR_LINES?: 1;
    STITCHING?: 1;
    TERRAIN_DEFORMATION?: 1;
    DISCARD_NODATA_ELEVATION?: 1;
    ENABLE_ELEVATION_RANGE?: 1;
    ELEVATION_LAYER?: 1;
    ENABLE_LAYER_MASKS?: 1;
    ENABLE_OUTLINES?: 1;
    APPLY_SHADING_ON_COLORLAYERS?: 1;
    ENABLE_GRATICULE?: 1;
    USE_ATLAS_TEXTURE?: 1;
    /** Normal color rendering */
    COLOR_RENDER?: 1;
    /** For depth-based effects, such as shadow maps for directional lights */
    DEPTH_RENDER?: 1;
    /** For distance-based effects, such as shadow maps for point lights */
    DISTANCE_RENDER?: 1;
    /** The number of _visible_ color layers */
    /**
     * The z coordinate of vertices is reset before computing terrain
     */
    GLOBE?: 1;
    /**
     * The number of _visible_ color layers
     */
    VISIBLE_COLOR_LAYER_COUNT: number;
    ENABLE_SKIRTS?: 1;
}
type ThreeUniforms = typeof UniformsLib.common & typeof UniformsLib.fog & typeof UniformsLib.lights;
interface Uniforms extends ThreeUniforms, Record<string, IUniform> {
    uuid: IUniform<number>;
    hillshading: IUniform<HillshadingUniform>;
    renderingState: IUniform<RenderingState>;
    segments: IUniform<number>;
    extent: IUniform<Vector4>;
    tileDimensions: IUniform<Vector2>;
    neighbours: IUniform<NeighbourUniform[]>;
    neighbourTextures: IUniform<(Texture | null)[]>;
    elevationRange: IUniform<Vector2>;
    baseTextureSize: IUniform<Vector2>;
    graticule: IUniform<GraticuleUniform>;
    contourLines: IUniform<ContourLineUniform>;
    backgroundColor: IUniform<Vector4>;
    tileOutlineColor: IUniform<Color>;
    brightnessContrastSaturation: IUniform<Vector3>;
    colorMapAtlas: IUniform<Texture | null>;
    layersColorMaps: IUniform<ColorMapUniform[]>;
    elevationColorMap: IUniform<ColorMapUniform>;
    elevationScaling: IUniform<number>;
    elevationTexture: IUniform<Texture | null>;
    atlasTexture: IUniform<Texture | null>;
    colorTextures: IUniform<Texture[]>;
    layers: IUniform<LayerUniform[]>;
    elevationLayer: IUniform<LayerUniform>;
    referencePosition: IUniform<Vector3>;
    nearDistance: IUniform<number>;
    farDistance: IUniform<number>;
    skirtElevation: IUniform<number>;
    skirtVertexRange: IUniform<Vector2>;
}
declare class LayeredMaterial extends ShaderMaterial implements MemoryUsage {
    readonly isMemoryUsage: true;
    light?: Light;
    private readonly _getIndexFn;
    private readonly _renderer;
    private readonly _colorLayers;
    private readonly _atlasInfo;
    private readonly _forceTextureAtlas;
    private readonly _maxTextureImageUnits;
    private readonly _textureSize;
    private readonly _texturesInfo;
    private _elevationLayer;
    private _mustUpdateUniforms;
    private _needsSorting;
    private _needsAtlasRepaint;
    private _composer;
    private _colorMapAtlas;
    private _composerDataType;
    readonly uniforms: Uniforms;
    readonly defines: Defines;
    private _options?;
    getMemoryUsage(context: GetMemoryUsageContext): void;
    constructor(params: {
        /** the material options. */
        options: MaterialOptions;
        /** the WebGL renderer. */
        renderer: WebGLRenderer;
        /** The number of maximum texture units in fragment shaders */
        maxTextureImageUnits: number;
        /** The function to help sorting color layers. */
        getIndexFn: (arg0: Layer) => number;
        /** The texture data type to be used for the atlas texture. */
        textureDataType: TextureDataType;
        hasElevationLayer: boolean;
        tileDimensions: Vector2;
        extent: Extent;
        textureSize: Vector2;
        isGlobe: boolean;
    });
    /**
     * @param v - The number of segments.
     */
    set segments(v: number);
    updateNeighbour(neighbour: number, diffLevel: number, offsetScale: OffsetScale, texture: Texture | null): void;
    setElevationScaling(scaling: number): void;
    onBeforeCompile(parameters: WebGLProgramParametersWithUniforms): void;
    private updateColorLayerUniforms;
    dispose(): void;
    getColorTexture(layer: ColorLayer): Texture | null;
    private countIndividualTextures;
    onBeforeRender(): void;
    /**
     * Determine if this material should write to the color buffer.
     */
    private updateColorWrite;
    repaintAtlas(): void;
    setColorTextures(layer: ColorLayer, textureAndPitch: TextureAndPitch): void;
    pushElevationLayer(layer: ElevationLayer): void;
    removeElevationLayer(): void;
    setElevationTexture(layer: ElevationLayer, { texture, pitch }: {
        texture: Texture;
        pitch: OffsetScale;
    }): void;
    private rebuildAtlasInfo;
    pushColorLayer(newLayer: ColorLayer): void;
    private getVisibleColorLayerCount;
    reorderLayers(): void;
    private sortLayersIfNecessary;
    removeColorLayer(layer: ColorLayer): void;
    /**
     * Sets the colormap atlas.
     *
     * @param atlas - The atlas.
     */
    setColorMapAtlas(atlas: ColorMapAtlas | null): void;
    private updateColorMaps;
    private updateGraticuleUniforms;
    private updateContourLineUniforms;
    private updateColorUniforms;
    private updateHillshadingUniforms;
    update(opts?: MaterialOptions): boolean;
    private updateColorLayerCount;
    customProgramCacheKey(): string;
    createComposer(): WebGLComposer;
    private get composerWidth();
    private get composerHeight();
    rebuildAtlasIfNecessary(): boolean;
    private rebuildAtlasTexture;
    changeState(state: RenderingState): void;
    private updateBlendingMode;
    hasColorLayer(layer: ColorLayer): boolean;
    hasElevationLayer(layer: ElevationLayer): boolean;
    indexOfColorLayer(layer: ColorLayer): number;
    private updateOpacityParameters;
    setLayerOpacity(layer: ColorLayer, opacity: number): void;
    setLayerVisibility(layer: ColorLayer, visible: boolean): void;
    setLayerElevationRange(layer: ColorLayer, range: ElevationRange | null): void;
    setColorimetry(layer: ColorLayer, brightness: number, contrast: number, saturation: number): void;
    getElevationTexture(): Texture | null;
    getElevationOffsetScale(): OffsetScale;
    /** @internal */
    getElevationLayer(): ElevationLayer | null;
    /**
     * Gets the number of layers on this material.
     *
     * @returns The number of layers present on this material.
     */
    getLayerCount(): number;
    setUuid(uuid: number): void;
}
export default LayeredMaterial;
//# sourceMappingURL=LayeredMaterial.d.ts.map