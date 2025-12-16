/**
 * Example: How to parse and display RAG responses in your React component
 * Add this to your chatbot page
 */

import { parseRAGResponse, formatRAGResponse } from "@/lib/parseRAGResponse";

// Example response from your API
const exampleResponse = {
  conversationId: 7,
  answer: `METADATA_START:{"sources": ["MANUEL OPERATOIRE ACP.pdf (p.206)", "MANUEL OPERATOIRE ACP.pdf (p.205)"], "context": "..."}:METADATA_END

La question "hello" ne correspond à aucun terme...`,
  sources: ["MANUEL OPERATOIRE ACP.pdf (p.206)", "MANUEL OPERATOIRE ACP.pdf (p.205)"],
};

// Parse the response
const parsed = parseRAGResponse(exampleResponse.answer);
const formatted = formatRAGResponse(parsed);

console.log("Extracted Answer:");
console.log(formatted.answer);
// Output: "La question "hello" ne correspond à aucun terme..."

console.log("Extracted Sources:");
console.log(formatted.sources);
// Output: ["MANUEL OPERATOIRE ACP.pdf (p.206)", "MANUEL OPERATOIRE ACP.pdf (p.205)"]

// ============================================
// How to use in a React component:
// ============================================

export function ChatMessage({ message }: { message: any }) {
  const parsed = parseRAGResponse(message.answer);
  const formatted = formatRAGResponse(parsed);

  return (
    <div className="space-y-4">
      {/* Answer */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-bold text-blue-900 mb-2">Answer</h3>
        <p className="text-blue-800 whitespace-pre-wrap">{formatted.answer}</p>
      </div>

      {/* Sources */}
      {formatted.sources.length > 0 && (
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-bold text-green-900 mb-2">Sources</h3>
          <ul className="list-disc list-inside space-y-1">
            {formatted.sources.map((source, idx) => (
              <li key={idx} className="text-green-800 text-sm">
                {source}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
