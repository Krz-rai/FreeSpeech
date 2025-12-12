"use client";

import { useState } from "react";
import { Search, Loader2, X, ExternalLink } from "lucide-react";

interface ResearchPanelProps {
  query: string;
  onComplete: (results: string) => void;
  onClose: () => void;
  className?: string;
}

interface SearchResult {
  title: string;
  snippet: string;
  url: string;
}

export function ResearchPanel({ 
  query, 
  onComplete, 
  onClose,
  className 
}: ResearchPanelProps) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedResults, setSelectedResults] = useState<Set<number>>(new Set());

  const handleSearch = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/tools/web-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, num_results: 5 }),
      });
      const data = await response.json();
      setResults(data.results || []);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseResults = () => {
    const selected = results.filter((_, i) => selectedResults.has(i));
    const summary = selected
      .map(r => `${r.title}: ${r.snippet}`)
      .join("\n\n");
    onComplete(summary || "No relevant results found");
  };

  // Auto-search on mount
  useState(() => {
    handleSearch();
  });

  return (
    <div className={`bg-white rounded-xl border shadow-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Search className="w-5 h-5 text-blue-600" />
          <span className="font-medium">Research: {query}</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
          <X className="w-5 h-5" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Searching...</span>
        </div>
      ) : (
        <>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {results.map((result, index) => (
              <label
                key={index}
                className={`block p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedResults.has(index) 
                    ? "bg-blue-50 border-blue-300" 
                    : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedResults.has(index)}
                    onChange={(e) => {
                      const newSet = new Set(selectedResults);
                      if (e.target.checked) {
                        newSet.add(index);
                      } else {
                        newSet.delete(index);
                      }
                      setSelectedResults(newSet);
                    }}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm flex items-center gap-1">
                      {result.title}
                      <ExternalLink className="w-3 h-3 text-gray-400" />
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{result.snippet}</p>
                  </div>
                </div>
              </label>
            ))}
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={handleUseResults}
              disabled={selectedResults.size === 0}
              className="flex-1 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
            >
              Use Selected ({selectedResults.size})
            </button>
            <button
              onClick={() => onComplete("I couldn't find what I was looking for")}
              className="px-4 py-2 border rounded-lg"
            >
              Skip
            </button>
          </div>
        </>
      )}
    </div>
  );
}

