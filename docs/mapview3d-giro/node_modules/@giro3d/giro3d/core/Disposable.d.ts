/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
/**
 * Trait of objects that hold unmanaged resources.
 */
export default interface Disposable {
    /**
     * Releases unmanaged resources from this object.
     */
    dispose(): void;
}
export declare function isDisposable(object: unknown): object is Disposable;
//# sourceMappingURL=Disposable.d.ts.map