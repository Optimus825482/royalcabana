/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import type ColorMap from '../../../core/ColorMap';
import type { HasDefines, VertexAttributeType } from '../../MaterialUtils';
import type { ColorMapUniform } from '../ColorMapUniform';
import { AttributeSlot } from './AttributeSlot';
export interface ScalarPropertiesUniform {
    weight: number;
    colorMap: ColorMapUniform;
}
export interface ScalarSlotState {
    weight: number;
    colorMap: ColorMap;
}
type SlotIndex = 0 | 1 | 2;
export declare class ScalarSlot extends AttributeSlot {
    static getAttributeName(index: SlotIndex): string;
    readonly uniform: ScalarPropertiesUniform;
    private readonly _material;
    private readonly _flagDefine;
    private readonly _typeDefine;
    colorMap: ColorMap;
    constructor(material: HasDefines, index: SlotIndex);
    get hasAttribute(): boolean;
    set hasAttribute(value: boolean);
    set attributeType(attributeType: VertexAttributeType);
    update(): void;
    get state(): ScalarSlotState;
    set state(state: Partial<ScalarSlotState>);
}
export {};
//# sourceMappingURL=ScalarSlot.d.ts.map