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
    <div className={`bg-card rounded-xl border-2 border-border shadow-none p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Search className="w-5 h-5 text-foreground" />
          <span className="font-bold">Research: {query}</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-accent rounded transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-foreground" />
          <span className="ml-2 text-muted-foreground font-medium">Searching...</span>
        </div>
      ) : (
        <>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {results.map((result, index) => (
              <label
                key={index}
                className={`block p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                  selectedResults.has(index) 
                    ? "bg-primary text-primary-foreground border-primary" 
                    : "bg-card border-border hover:bg-accent hover:border-foreground"
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
                    className="mt-1 accent-current"
                  />
                  <div className="flex-1">
                    <div className="font-bold text-sm flex items-center gap-1">
                      {result.title}
                      <ExternalLink className={`w-3 h-3 ${selectedResults.has(index) ? 'text-primary-foreground/70' : 'text-muted-foreground'}`} />
                    </div>
                    <p className={`text-xs mt-1 font-medium ${selectedResults.has(index) ? 'text-primary-foreground/90' : 'text-muted-foreground'}`}>{result.snippet}</p>
                  </div>
                </div>
              </label>
            ))}
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={handleUseResults}
              disabled={selectedResults.size === 0}
              className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50 font-bold hover:opacity-90 transition-opacity"
            >
              Use Selected ({selectedResults.size})
            </button>
            <button
              onClick={() => onComplete("I couldn't find what I was looking for")}
              className="px-4 py-2 border-2 border-border rounded-lg font-medium hover:bg-accent transition-colors"
            >
              Skip
            </button>
          </div>
        </>
      )}
    </div>
  );
}
