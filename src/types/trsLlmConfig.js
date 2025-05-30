// @flow
// src/types/trsLlmConfig.js

/**
 * @typedef {object} LlmParameters
 * @property {string} [temperature] - Example parameter.
 * @property {string} [max_tokens] - Example parameter.
 * Add other specific parameters as needed.
 */

/**
 * @typedef {object} TrsLlmConfig
 * @property {string} api - The API endpoint or provider.
 * @property {string} model - The specific model being used.
 * @property {string} api_key - The API key.
 * @property {LlmParameters} parameter - Key-value pairs for LLM parameters.
 * Represents the structure of llm_config.json
 */

// TypeScript equivalent:
// export interface LlmParameters {
//   [key: string]: string; // Allows for arbitrary string key-value pairs
//   temperature?: string;
//   max_tokens?: string;
// }
//
// export interface TrsLlmConfig {
//   api: string;
//   model: string;
//   api_key: string;
//   parameter: LlmParameters;
// }
