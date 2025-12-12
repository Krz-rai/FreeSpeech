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

export function SmartReplies({ 
  options, 
  onSelect, 
  onRegenerate,
  className 
}: SmartRepliesProps) {
  if (options.length === 0) {
    return (
      <div className={`text-center text-muted-foreground py-4 ${className}`}>
        <p className="text-sm font-medium">Waiting for conversation...</p>
        <p className="text-xs mt-1">Reply options will appear when someone speaks</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-foreground">Quick Replies</span>
          <span className="text-xs font-medium text-muted-foreground px-2 py-0.5 border border-border rounded-full">
            Select to respond
          </span>
        </div>
        <button
          onClick={onRegenerate}
          className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
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
            className="w-full p-4 text-left rounded-xl border-2 border-border bg-card hover:bg-primary hover:text-primary-foreground transition-all group"
          >
            <div className="flex items-start justify-between">
              <span className="text-lg font-medium">{reply.text}</span>
              <kbd className="ml-2 px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded border border-primary group-hover:bg-primary-foreground group-hover:text-primary">
                {index + 1}
              </kbd>
            </div>
          </button>
        ))}
      </div>
      
      <p className="text-xs text-muted-foreground mt-2 text-center font-medium">
        Press 1, 2, or 3 to quick-select • Type below for custom response
      </p>
    </div>
  );
}
