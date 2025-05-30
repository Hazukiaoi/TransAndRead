/**
 * Calls an OpenAI-compatible LLM API.
 *
 * @param {string} apiAddress - The full API endpoint URL (e.g., "http://localhost:1234/v1/chat/completions").
 * @param {string} apiKey - The API key.
 * @param {string} model - The model name.
 * @param {Array<object>} messages - Array of message objects (e.g., [{role: 'user', content: '...'}])
 * @param {object} customParams - Custom parameters to include in the request body (e.g., temperature).
 * @param {number} timeoutSeconds - Timeout for the request in seconds.
 * @returns {Promise<object>} - A promise that resolves to the API response or an error object.
 */
export async function callLlmApi({
  apiAddress,
  apiKey,
  model,
  messages,
  customParams = {},
  timeoutSeconds = 120, // Default timeout from translateConfig
}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutSeconds * 1000);

  // Default stream to false for simpler non-streaming test, unless overridden by customParams
  const requestBody = {
    model,
    messages,
    stream: false, // Default for this function, can be overridden
    ...customParams,
  };

  // Ensure numeric parameters from customParams are actually numbers if expected by API
  if (requestBody.temperature) requestBody.temperature = parseFloat(requestBody.temperature);
  if (requestBody.max_tokens) requestBody.max_tokens = parseInt(requestBody.max_tokens, 10);
  // Add other common params that need type conversion if necessary, e.g., top_p, frequency_penalty

  try {
    const response = await fetch(apiAddress, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text(); // Try to get more info
      return { 
        error: true, 
        status: response.status, 
        message: `API request failed: ${response.statusText}`,
        details: errorBody 
      };
    }

    const jsonResponse = await response.json();
    // Basic check for OpenAI-like response structure
    if (jsonResponse.choices && jsonResponse.choices.length > 0 && jsonResponse.choices[0].message) {
      return { success: true, data: jsonResponse };
    } else {
      return { error: true, message: "Invalid response structure from LLM API.", details: jsonResponse };
    }

  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      return { error: true, message: `Request timed out after ${timeoutSeconds} seconds.` };
    }
    return { error: true, message: `Network or other error: ${error.message}` };
  }
}
