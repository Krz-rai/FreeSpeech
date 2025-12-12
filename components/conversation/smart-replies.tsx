"use client";

import { RefreshCw } from "lucide-react";

interface SmartReply {
  id: string;
  text: string;
  category: string;
}

interface SmartRepliesProps {
  options: SmartReply[];
  onSelect: (reply: SmartReply) => void;
  onRegenerate: () => void;
  className?: string;
}

const categoryColors: Record<string, string> = {
  affirmative: "bg-green-50 border-green-200 hover:bg-green-100",
  question: "bg-blue-50 border-blue-200 hover:bg-blue-100",
  clarification: "bg-yellow-50 border-yellow-200 hover:bg-yellow-100",
  emotional: "bg-pink-50 border-pink-200 hover:bg-pink-100",
  informational: "bg-purple-50 border-purple-200 hover:bg-purple-100",
};

export function SmartReplies({ 
  options, 
  onSelect, 
  onRegenerate,
  className 
}: SmartRepliesProps) {
  if (options.length === 0) {
    return (
      <div className={`text-center text-gray-500 py-4 ${className}`}>
        <p className="text-sm">Waiting for conversation...</p>
        <p className="text-xs mt-1">Reply options will appear when someone speaks</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-600">Quick Replies</span>
        <button
          onClick={onRegenerate}
          className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
          title="Get different options"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
      
      <div className="grid gap-2">
        {options.map((reply, index) => (
          <button
            key={reply.id}
            onClick={() => onSelect(reply)}
            className={`w-full p-4 text-left rounded-xl border-2 transition-all ${
              categoryColors[reply.category] || "bg-gray-50 border-gray-200 hover:bg-gray-100"
            }`}
          >
            <div className="flex items-start justify-between">
              <span className="text-lg">{reply.text}</span>
              <kbd className="ml-2 px-2 py-0.5 text-xs bg-white rounded border">
                {index + 1}
              </kbd>
            </div>
          </button>
        ))}
      </div>
      
      <p className="text-xs text-gray-400 mt-2 text-center">
        Press 1, 2, or 3 to quick-select • Type below for custom response
      </p>
    </div>
  );
}

