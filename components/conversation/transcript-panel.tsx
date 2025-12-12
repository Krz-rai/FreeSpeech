"use client";

import { useEffect, useRef } from "react";

interface TranscriptEntry {
  role: "user" | "agent" | "other";
  text: string;
  timestamp: number;
}

interface TranscriptPanelProps {
  entries: TranscriptEntry[];
  isSpeaking: boolean;
  className?: string;
}

export function TranscriptPanel({ entries, isSpeaking, className }: TranscriptPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries, isSpeaking]);

  return (
    <div className={`bg-white rounded-xl border shadow-sm flex flex-col overflow-hidden ${className}`}>
      <div className="p-3 border-b bg-gray-50 flex justify-between items-center">
        <h3 className="font-medium text-gray-700">Live Transcript</h3>
        <span className="text-xs text-gray-400">
          {entries.length > 0 ? `${entries.length} messages` : "Waiting to start..."}
        </span>
      </div>
      
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {entries.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 text-center p-4">
            <p>Conversation history will appear here.</p>
          </div>
        )}
        
        {entries.map((entry, i) => (
          <div 
            key={i} 
            className={`flex flex-col ${
              entry.role === "agent" ? "items-end" : "items-start"
            }`}
          >
            <div 
              className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                entry.role === "agent" 
                  ? "bg-blue-600 text-white rounded-br-none" 
                  : entry.role === "user"
                    ? "bg-gray-200 text-gray-800 rounded-bl-none" // Should not happen often if user is mute? 
                    : "bg-gray-100 text-gray-800 rounded-bl-none border border-gray-200" // "other" person
              }`}
            >
              <p className="text-sm">{entry.text}</p>
            </div>
            <span className="text-xs text-gray-400 mt-1 px-1">
              {entry.role === "agent" ? "Me (AI)" : entry.role === "other" ? "Partner" : "Me (Text)"}
            </span>
          </div>
        ))}

        {isSpeaking && (
          <div className="flex flex-col items-end">
             <div className="max-w-[80%] rounded-2xl px-4 py-2 bg-blue-50 text-blue-800 rounded-br-none border border-blue-100">
              <div className="flex gap-1 items-center h-5">
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:0.1s]" />
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:0.2s]" />
              </div>
            </div>
            <span className="text-xs text-gray-400 mt-1 px-1">Speaking...</span>
          </div>
        )}
      </div>
    </div>
  );
}

