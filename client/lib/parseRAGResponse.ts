export interface ParsedResponse {
  answer: string;
  sources: string[];
  context: string;
  rawResponse: string;
}

export function parseRAGResponse(rawResponse: string): ParsedResponse {
  const result: ParsedResponse = {
    answer: "",
    sources: [],
    context: "",
    rawResponse: rawResponse,
  };

  try {
    const metadataStart = rawResponse.indexOf("METADATA_START:");
    const metadataEnd = rawResponse.indexOf(":METADATA_END");

    let metadata: { sources?: string[]; context?: string } = {};
    let answerText = rawResponse;

    if (metadataStart !== -1 && metadataEnd !== -1) {
      const metadataContent = rawResponse.slice(
        metadataStart + 15,
        metadataEnd
      );

      try {
        const jsonStr = metadataContent
          .replace(/'/g, '"')
          .replace(/True/g, 'true')
          .replace(/False/g, 'false')
          .replace(/None/g, 'null');

        metadata = JSON.parse(jsonStr);
        result.sources = metadata.sources || [];
        result.context = metadata.context || "";

        answerText = rawResponse
          .slice(0, metadataStart) // Everything before metadata
          .concat(rawResponse.slice(metadataEnd + 13)); // Everything after ":METADATA_END"
      } catch (parseErr) {
        console.error("Failed to parse metadata JSON:", parseErr);
        console.error("Metadata content:", metadataContent);
      }
    }

    // Clean up answer text
    result.answer = answerText
      .trim()
      .replace(/^[\n\r]+/, "")
      .replace(/[\n\r]+$/, "");

    return result;
  } catch (error) {
    console.error("Error parsing RAG response:", error);
    return result;
  }
}

export function formatRAGResponse(parsed: ParsedResponse): {
  answer: string;
  sources: string[];
} {
  return {
    answer: parsed.answer,
    sources: parsed.sources,
  };
}
