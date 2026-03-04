/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import type { BufferGeometry, Camera, IUniform, Scene, Texture, WebGLRenderer } from 'three';
import { Color, Matrix4, ShaderMaterial, Vector2, Vector3, Vector4 } from 'three';
import type ColorMap from '../core/ColorMap';
import type Extent from '../core/geographic/Extent';
import type ColorLayer from '../core/layer/ColorLayer';
import type { TextureAndPitch } from '../core/layer/Layer';
import type { IntersectingVolume, IntersectingVolumesUniform } from './IntersectingVolume';
import type { VertexAttributeType } from './MaterialUtils';
import type { ColorMapUniform } from './pointcloudmaterial/ColorMapUniform';
import type { ClassificationPropertiesUniform, ClassificationSlotState } from './pointcloudmaterial/slots/ClassificationSlot';
import type { ColorPropertiesUniform, ColorSlotState } from './pointcloudmaterial/slots/ColorSlot';
import type { ScalarPropertiesUniform, ScalarSlotState } from './pointcloudmaterial/slots/ScalarSlot';
import OffsetScale from '../core/OffsetScale';
import { ASPRS_CLASSIFICATIONS, Classification } from './pointcloudmaterial/Classification';
export { ASPRS_CLASSIFICATIONS, Classification };
/**
 * Specifies the way points are colored.
 */
export declare enum MODE {
    /** The points are colored using their own color */
    COLOR = 0,
    /** The points are colored using  one of their attributes */
    SCALAR = 1,
    /** The points are colored using their classification */
    CLASSIFICATION = 2,
    /** The points are colored using their normal */
    NORMAL = 3,
    /** The points are colored using an external texture, such as a color layer */
    TEXTURE = 4,
    /** The points are colored using their elevation */
    ELEVATION = 5,
    /** The points are colored using a mix of their attributes */
    ATTRIBUTES = 6
}
export type Mode = (typeof MODE)[keyof typeof MODE];
export interface PointCloudMaterialOptions {
    /**
     * The point size.
     *
     * @defaultValue 0
     */
    size?: number;
    /**
     * The point decimation.
     *
     * @defaultValue 1
     */
    decimation?: number;
    /**
     * An additional color to use.
     *
     * @defaultValue `new Vector4(0, 0, 0, 0)`
     */
    overlayColor?: Vector4;
    /**
     * Specifies the criterion to colorize points.
     *
     * @defaultValue MODE.COLOR
     */
    mode?: Mode;
}
interface Deformation {
    transformation: Matrix4;
    origin: Vector2;
    influence: Vector2;
    color: Color;
    vec: Vector3;
}
interface Uniforms extends Record<string, IUniform> {
    opacity: IUniform<number>;
    brightnessContrastSaturation: IUniform<Vector3>;
    size: IUniform<number>;
    decimation: IUniform<number>;
    mode: IUniform<MODE>;
    pickingId: IUniform<number>;
    overlayColor: IUniform<Vector4>;
    hasOverlayTexture: IUniform<number>;
    overlayTexture: IUniform<Texture | null>;
    offsetScale: IUniform<OffsetScale>;
    extentBottomLeft: IUniform<Vector2>;
    extentSize: IUniform<Vector2>;
    elevationColorMap: IUniform<ColorMapUniform>;
    colorProperties: IUniform<ColorPropertiesUniform[]>;
    scalarProperties: IUniform<ScalarPropertiesUniform[]>;
    classificationProperties: IUniform<ClassificationPropertiesUniform[]>;
    enableDeformations: IUniform<boolean>;
    deformations: IUniform<Deformation[]>;
    intersectingVolumes: IUniform<IntersectingVolumesUniform>;
    fogDensity: IUniform<number>;
    fogNear: IUniform<number>;
    fogFar: IUniform<number>;
    fogColor: IUniform<Color>;
}
export interface Defines extends Record<string, unknown> {
    NORMAL?: 1;
    COLOR_1?: 1;
    COLOR_2?: 1;
    CLASSIFICATION_0?: 1;
    CLASSIFICATION_1?: 1;
    CLASSIFICATION_2?: 1;
    DEFORMATION_SUPPORT?: 1;
    NUM_TRANSFO?: number;
    USE_LOGDEPTHBUF?: 1;
    NORMAL_OCT16?: 1;
    NORMAL_SPHEREMAPPED?: 1;
    INTERSECTING_VOLUMES_SUPPORT?: 1;
    MAX_INTERSECTING_VOLUMES_COUNT?: number;
    SCALAR_0?: 1;
    SCALAR_0_TYPE: VertexAttributeType;
    SCALAR_1?: 1;
    SCALAR_1_TYPE: VertexAttributeType;
    SCALAR_2?: 1;
    SCALAR_2_TYPE: VertexAttributeType;
}
export interface AttributesState {
    colors: [ColorSlotState, ColorSlotState, ColorSlotState];
    scalars: [ScalarSlotState, ScalarSlotState, ScalarSlotState];
    classifications: [ClassificationSlotState, ClassificationSlotState, ClassificationSlotState];
}
export interface PartialAttributesState {
    colors?: Array<Partial<ColorSlotState> | undefined>;
    scalars?: Array<Partial<ScalarSlotState> | undefined>;
    classifications?: Array<Partial<ClassificationSlotState> | undefined>;
}
/**
 * Material used for point clouds.
 */
declare class PointCloudMaterial extends ShaderMaterial {
    static readonly maxIntersectingVolumesCount: number;
    readonly isPointCloudMaterial = true;
    colorLayer: ColorLayer | null;
    disposed: boolean;
    intersectingVolumes: IntersectingVolume[];
    private _elevationColorMap;
    private readonly _colorSlots;
    private readonly _scalarSlots;
    private readonly _classificationSlots;
    /**
     * @internal
     */
    readonly uniforms: Uniforms;
    /**
     * @internal
     */
    readonly defines: Defines;
    /**
     * Gets or sets the point size.
     */
    get size(): number;
    set size(value: number);
    /**
     * Gets or sets the point decimation value.
     * A decimation value of N means that we take every Nth point and discard the rest.
     */
    get decimation(): number;
    set decimation(value: number);
    /**
     * Gets or sets the display mode (color, classification...)
     */
    get mode(): Mode;
    set mode(mode: Mode);
    /**
     * Update material uniforms related to scalar and classification attributes.
     */
    setupFromGeometry(geometry: BufferGeometry): void;
    /**
     * @internal
     */
    get pickingId(): number;
    /**
     * @internal
     */
    set pickingId(id: number);
    /**
     * Gets or sets the overlay color (default color).
     */
    get overlayColor(): Vector4;
    set overlayColor(color: Vector4);
    /**
     * Gets or sets the brightness of the points.
     */
    get brightness(): number;
    set brightness(v: number);
    /**
     * Gets or sets the contrast of the points.
     */
    get contrast(): number;
    set contrast(v: number);
    /**
     * Gets or sets the saturation of the points.
     */
    get saturation(): number;
    set saturation(v: number);
    get elevationColorMap(): ColorMap;
    set elevationColorMap(colorMap: ColorMap);
    /**
     * Creates a PointsMaterial using the specified options.
     *
     * @param options - The options.
     */
    constructor(options?: PointCloudMaterialOptions);
    dispose(): void;
    /**
     * Internally used for picking.
     * @internal
     */
    enablePicking(picking: number): void;
    hasColorLayer(layer: ColorLayer): boolean;
    updateUniforms(): void;
    onBeforeRender(_renderer: WebGLRenderer, _scene: Scene, camera: Camera): void;
    copy(source: PointCloudMaterial): this;
    removeColorLayer(): void;
    pushColorLayer(layer: ColorLayer, extent: Extent): void;
    indexOfColorLayer(layer: ColorLayer): number;
    getColorTexture(layer: ColorLayer): Texture | null;
    setColorTextures(layer: ColorLayer, textureAndPitch: TextureAndPitch): void;
    setLayerVisibility(): void;
    setLayerOpacity(): void;
    setLayerElevationRange(): void;
    setColorimetry(layer: ColorLayer, brightness: number, contrast: number, saturation: number): void;
    get attributesState(): AttributesState;
    set attributesState(state: PartialAttributesState);
    /**
     * Unused for now.
     * @internal
     */
    enableTransfo(v: boolean): void;
    private updateIntersectingVolumes;
    private updateAttributesWeights;
    static isPointCloudMaterial: (obj: unknown) => obj is PointCloudMaterial;
}
export default PointCloudMaterial;
//# sourceMappingURL=PointCloudMaterial.d.ts.map