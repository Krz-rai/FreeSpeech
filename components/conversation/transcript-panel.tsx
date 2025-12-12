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
    <div className={`bg-card rounded-xl border-2 border-border shadow-none flex flex-col overflow-hidden ${className}`}>
      <div className="p-3 border-b-2 border-border bg-muted/20 flex justify-between items-center">
        <h3 className="font-bold text-foreground">Live Transcript</h3>
        <span className="text-xs text-muted-foreground font-medium">
          {entries.length > 0 ? `${entries.length} messages` : "Waiting to start..."}
        </span>
      </div>
      
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {entries.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-center p-4">
            <p className="font-medium">Conversation history will appear here.</p>
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
              className={`max-w-[80%] rounded-2xl px-4 py-2 border-2 ${
                entry.role === "agent" 
                  ? "bg-primary text-primary-foreground border-primary rounded-br-none" 
                  : entry.role === "user"
                    ? "bg-card text-foreground border-border rounded-bl-none"
                    : "bg-muted text-foreground border-transparent rounded-bl-none" // "other" person
              }`}
            >
              <p className="text-sm font-medium">{entry.text}</p>
            </div>
            <span className="text-xs text-muted-foreground mt-1 px-1 font-medium">
              {entry.role === "agent" ? "Me (AI)" : entry.role === "other" ? "Partner" : "Me (Text)"}
            </span>
          </div>
        ))}

        {isSpeaking && (
          <div className="flex flex-col items-end">
             <div className="max-w-[80%] rounded-2xl px-4 py-2 bg-card text-foreground rounded-br-none border-2 border-border">
              <div className="flex gap-1 items-center h-5">
                  <span className="w-1.5 h-1.5 bg-foreground rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-foreground rounded-full animate-bounce [animation-delay:0.1s]" />
                  <span className="w-1.5 h-1.5 bg-foreground rounded-full animate-bounce [animation-delay:0.2s]" />
              </div>
            </div>
            <span className="text-xs text-muted-foreground mt-1 px-1 font-medium">Speaking...</span>
          </div>
        )}
      </div>
    </div>
  );
}
