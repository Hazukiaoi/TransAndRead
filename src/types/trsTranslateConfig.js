// @flow
// src/types/trsTranslateConfig.js

/**
 * @typedef {object} TrsTranslateConfig
 * @property {number} [maxTextLength] - Maximum text length for translation.
 * @property {string} [sourceLang] - Source language code (e.g., "en").
 * @property {string} [targetLang] - Target language code (e.g., "zh").
 * @property {boolean} [autoTranslate] - Whether to auto-translate on load.
 * Add other specific translation settings as needed.
 * Represents the structure of translate_config.json
 */

// TypeScript equivalent:
// export interface TrsTranslateConfig {
//   maxTextLength?: number;
//   sourceLang?: string;
//   targetLang?: string;
//   autoTranslate?: boolean;
//   [key: string]: any; // Allows for other arbitrary settings
// }
