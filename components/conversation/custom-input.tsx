"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Search, Keyboard } from "lucide-react";

interface CustomInputProps {
  onSubmit: (text: string) => void;
  onResearchTrigger: () => void;
  placeholder?: string;
}

export function CustomInput({ 
  onSubmit, 
  onResearchTrigger,
  placeholder 
}: CustomInputProps) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (!text.trim()) return;
    onSubmit(text.trim());
    setText("");
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Enter to submit (without shift)
      if (e.key === "Enter" && !e.shiftKey && document.activeElement === inputRef.current) {
        e.preventDefault();
        handleSubmit();
      }
      
      // Cmd/Ctrl + K for research
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onResearchTrigger();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [text, onSubmit, onResearchTrigger]);

  return (
    <div className="bg-card rounded-xl border-2 border-border shadow-none">
      <div className="flex items-end gap-2 p-3">
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className="flex-1 resize-none border-0 focus:ring-0 text-lg p-2 outline-none bg-transparent placeholder:text-muted-foreground"
        />
        <div className="flex flex-col gap-2">
          <button
            onClick={onResearchTrigger}
            className="p-3 rounded-lg border-2 border-border hover:bg-accent transition-colors"
            title="Research (⌘K)"
          >
            <Search className="w-5 h-5" />
          </button>
          <button
            onClick={handleSubmit}
            disabled={!text.trim()}
            className="p-3 rounded-lg bg-primary text-primary-foreground disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div className="px-4 pb-2 flex items-center gap-4 text-xs text-muted-foreground font-medium">
        <span className="flex items-center gap-1">
          <Keyboard className="w-3 h-3" /> Enter to send
        </span>
        <span>⌘K to research</span>
      </div>
    </div>
  );
}
