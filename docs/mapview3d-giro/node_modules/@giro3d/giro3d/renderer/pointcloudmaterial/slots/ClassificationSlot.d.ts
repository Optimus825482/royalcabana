/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import type { Texture } from 'three';
import type { HasDefines } from '../../MaterialUtils';
import type { Classification } from '../Classification';
import { ClassificationsTexture } from '../Classification';
import { AttributeSlot } from './AttributeSlot';
export interface ClassificationPropertiesUniform {
    weight: number;
    lut: Texture | null;
}
export interface ClassificationSlotState {
    weight: number;
    classifications: Classification[];
}
type SlotIndex = 0 | 1 | 2;
export declare class ClassificationSlot extends AttributeSlot {
    static getAttributeName(index: SlotIndex): string;
    readonly texture: ClassificationsTexture;
    readonly uniform: ClassificationPropertiesUniform;
    private readonly _material;
    private readonly _flagDefine;
    constructor(material: HasDefines, index: SlotIndex);
    get classifications(): Classification[];
    set classifications(classifications: Classification[]);
    get hasAttribute(): boolean;
    set hasAttribute(value: boolean);
    update(): void;
    dispose(): void;
    get state(): ClassificationSlotState;
    set state(state: Partial<ClassificationSlotState>);
}
export {};
//# sourceMappingURL=ClassificationSlot.d.ts.map