/**
 * Groups article segments into batches for translation based on maxTextLength.
 *
 * @param {Array<{src: string, trans: string, chapters?: string}>} article - The article segments.
 * @param {number} maxTextLength - Maximum character length for a single LLM request.
 * @returns {Array<Array<{originalIndex: number, srcText: string}>>} - An array of batches.
 */
export function segmentArticleForTranslation(article, maxTextLength) {
  if (!article || article.length === 0 || maxTextLength <= 0) {
    return [];
  }

  const batches = [];
  let currentBatch = [];
  let currentBatchLength = 0;

  article.forEach((segment, index) => {
    // Skip empty or whitespace-only source segments for actual batching,
    // but they exist in the article and need to be mapped back.
    // For now, let's assume all segments with .src should be included if not empty.
    const srcText = segment.src || ""; // Ensure srcText is a string
    const segmentLength = srcText.length;

    if (segmentLength === 0) {
      // If a segment is empty, decide how to handle it.
      // Option 1: Add it as a standalone item in its own batch (if it needs to be "processed")
      // Option 2: Skip it (if empty segments don't need translation)
      // Option 3: If a batch is open, add it to signify its place, then close batch if needed.
      // For now, let's assume empty src means it doesn't contribute to length or translation.
      // We still need to track its originalIndex if it's part of a larger logical unit.
      // This simplified version will just create batches of non-empty text.
      // A more complex version might need to preserve empty segments in the batch structure.
      return; // Skip purely empty src segments from batching for LLM
    }
    
    if (segmentLength > maxTextLength) {
      // Handle segments that themselves exceed maxTextLength
      // Option 1: Truncate (data loss)
      // Option 2: Split the segment further (complex, requires word boundary logic)
      // Option 3: Send as is and hope LLM handles it (API might reject)
      // Option 4: Add to current batch and let it exceed, or start new batch
      
      // If a batch is open, close it first
      if (currentBatch.length > 0) {
        batches.push(currentBatch);
        currentBatch = [];
        currentBatchLength = 0;
      }
      // Add the oversized segment as its own batch
      batches.push([{ originalIndex: index, srcText: srcText.substring(0, maxTextLength) }]); // Example: truncate
      // console.warn(`Segment at index ${index} exceeds maxTextLength and was truncated.`);
      return;
    }

    if (currentBatchLength + segmentLength > maxTextLength && currentBatch.length > 0) {
      // Current batch is full, start a new one
      batches.push(currentBatch);
      currentBatch = [];
      currentBatchLength = 0;
    }

    // Add segment to current batch
    currentBatch.push({ originalIndex: index, srcText: srcText });
    currentBatchLength += segmentLength;
  });

  // Add the last batch if it has segments
  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
}
