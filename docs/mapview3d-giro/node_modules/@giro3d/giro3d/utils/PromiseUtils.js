/**
 * Copyright (c) 2015-2018, IGN France.
 * Copyright (c) 2018-2025, Giro3D team.
 * SPDX-License-Identifier: MIT
 */

/**
 * Returns a promise that will resolve after the specified duration.
 *
 * @param duration - The duration, in milliseconds.
 * @returns The promise.
 */
function delay(duration) {
  return new Promise(resolve => setTimeout(resolve, duration));
}
export let PromiseStatus = /*#__PURE__*/function (PromiseStatus) {
  PromiseStatus["Fullfilled"] = "fulfilled";
  PromiseStatus["Rejected"] = "rejected";
  return PromiseStatus;
}({});
export class AbortError extends Error {
  constructor() {
    super('aborted');
    this.name = 'AbortError';
  }
}

/**
 * Returns an Error with the 'aborted' reason.
 *
 * @returns The error.
 */
function abortError() {
  return new AbortError();
}
export default {
  delay,
  PromiseStatus,
  abortError
};