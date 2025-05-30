// @flow
// src/types/trsPrompt.js

/**
 * @typedef {object} PromptItem
 * @property {string} type - Type of the prompt (e.g., "system", "user").
 * @property {string} system - System part of the prompt.
 * @property {string} user - User part of the prompt.
 */

/**
 * @typedef {PromptItem[]} TrsPrompt
 * Represents the structure of prompt.json
 */

// TypeScript equivalent:
// export interface PromptItem {
//   type: string;
//   system: string;
//   user: string;
// }
// export type TrsPrompt = PromptItem[];
