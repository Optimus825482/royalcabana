/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */
import type Disposable from './Disposable';
/**
 * Represents an object that can be shared among multiple instances (multiple ownership).
 */
export default class Shared<T extends object, Owner = unknown> implements Disposable {
    private readonly _object;
    private readonly _owner;
    private readonly _refCount;
    private readonly _onDispose;
    private _disposed;
    private constructor();
    /**
     * The underlying shared object.
     */
    get object(): T;
    /**
     * Gets the original (first) owner of the shared object.
     */
    get owner(): Owner;
    /**
     * Creates a new shared object with the specified owner.
     * @param obj - The object to share.
     * @param owner - The owner of the object.
     * @param onDispose - The callback to apply when the ref count reaches zero.
     */
    static new<T extends object, Owner = unknown>(obj: T, owner: Owner, onDispose: (obj: T) => void): Shared<T, Owner>;
    /**
     * Clones the reference to the shared object, incrementing the ref count.
     * Note: this does _not_ clone the shared object itself.
     */
    clone(): Shared<T, Owner>;
    private checkDisposed;
    /**
     * Decrement the ref count of this object. If the count becomes zero, the underlying object is also disposed.
     */
    dispose(): void;
}
//# sourceMappingURL=Shared.d.ts.map