"use client";

import { useEffect, useState, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { TranscriptPanel } from "@/components/conversation/transcript-panel";
import { SmartReplies } from "@/components/conversation/smart-replies";
import { CustomInput } from "@/components/conversation/custom-input";
import { ResearchPanel } from "@/components/conversation/research-panel";
import { Mic, MicOff } from "lucide-react";

interface SmartReply {
  id: string;
  text: string;
  category: string;
}

interface TranscriptEntry {
  role: "user" | "agent" | "other";
  text: string;
  timestamp: number;
}

export default function ConversationPage() {
  const { user } = useUser();
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [smartReplies, setSmartReplies] = useState<SmartReply[]>([]);
  const [researchQuery, setResearchQuery] = useState<string | null>(null);
  const [isResearchOpen, setIsResearchOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isGeneratingReplies, setIsGeneratingReplies] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Convex queries
  const dbUser = useQuery(api.users.getUser, { authId: user?.id ?? "" });
  const saveTranscript = useMutation(api.conversations.saveTranscript);
  const recordReplySelection = useMutation(api.analytics.recordReplySelection);
  const createUser = useMutation(api.users.createUser);

  // Ensure user exists in Convex
  useEffect(() => {
    if (user && dbUser === null) {
      createUser({
        authId: user.id,
        email: user.emailAddresses[0]?.emailAddress,
        name: user.fullName || user.firstName || "User",
      });
    }
  }, [user, dbUser, createUser]);

  // Initialize Web Speech API
  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.error("Speech recognition not supported");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = async (event: any) => {
      const last = event.results.length - 1;
      const text = event.results[last][0].transcript;

      console.log("👂 Heard:", text);

      // Add to transcript as "other" (User1 speaking)
      const newEntry: TranscriptEntry = {
        role: "other",
        text: text,
        timestamp: Date.now(),
      };

      setTranscript((prev) => {
        const updated = [...prev, newEntry];
        // Generate smart replies based on new transcript
        generateSmartReplies(updated);
        return updated;
      });
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "no-speech") {
        // Automatically restart if no speech detected
        if (isListening) {
          try {
            recognition.start();
          } catch (e) {
            // Already started
          }
        }
      }
    };

    recognition.onend = () => {
      // Automatically restart if still in listening mode
      if (isListening) {
        try {
          recognition.start();
        } catch (e) {
          // Already started
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Already stopped
        }
      }
    };
  }, [isListening]);

  // Generate smart replies using API
  const generateSmartReplies = async (currentTranscript: TranscriptEntry[]) => {
    if (currentTranscript.length === 0) return;

    setIsGeneratingReplies(true);
    try {
      const response = await fetch("/api/generate-replies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: currentTranscript,
          userName: dbUser?.name || "User",
          communicationStyle: dbUser?.communicationStyle || "warm and conversational",
        }),
      });

      const data = await response.json();
      if (data.replies && data.replies.length > 0) {
        console.log("✨ Generated replies:", data.replies);
        setSmartReplies(data.replies);
      }
    } catch (error) {
      console.error("Failed to generate replies:", error);
    } finally {
      setIsGeneratingReplies(false);
    }
  };

  // Start/Stop listening
  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition not supported in this browser");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error("Failed to start recognition:", e);
      }
    }
  };

  // Speak using ElevenLabs TTS
  const speakText = async (text: string) => {
    if (!dbUser?.elevenLabsVoiceId) {
      alert("Please complete voice setup first");
      return;
    }

    setIsSpeaking(true);
    try {
      // Call our API route for TTS
      const response = await fetch("/api/speak", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text,
          voiceId: dbUser.elevenLabsVoiceId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "TTS request failed");
      }

      // Play the audio
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.onerror = (e) => {
        console.error("Audio playback error:", e);
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();

      // Add to transcript as "agent" (me speaking)
      setTranscript((prev) => [
        ...prev,
        {
          role: "agent",
          text: text,
          timestamp: Date.now(),
        },
      ]);
    } catch (error: any) {
      console.error("Failed to speak:", error);
      alert(`Speech failed: ${error.message}`);
      setIsSpeaking(false);
    }
  };

  // Handle smart reply selection
  const handleSelectReply = async (reply: SmartReply) => {
    // Record selection for learning
    if (dbUser?._id) {
      await recordReplySelection({
        userId: dbUser._id,
        selectedText: reply.text,
        category: reply.category,
        allOptions: smartReplies,
      });
    }

    // Speak the reply
    await speakText(reply.text);

    // Clear replies
    setSmartReplies([]);
  };

  // Handle custom text input
  const handleCustomInput = async (text: string) => {
    await speakText(text);
    setSmartReplies([]);
  };

  // Handle research completion
  const handleResearchComplete = (results: string) => {
    setIsResearchOpen(false);
    setResearchQuery(null);
    // TODO: Incorporate research results into context
  };

  // End conversation
  const endConversation = async () => {
    // Stop listening
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    // Save transcript to Convex
    if (transcript.length > 0 && dbUser?._id) {
      await saveTranscript({
        userId: dbUser._id,
        entries: transcript,
      });
    }

    setTranscript([]);
    setSmartReplies([]);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-background border-b-2 border-border px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-xl font-bold text-foreground">FreeSpeech</h1>
        <div className="flex items-center gap-4">
          <div
            className={`w-3 h-3 rounded-full border-2 border-foreground ${
              isListening ? "bg-foreground animate-pulse" : "bg-background"
            }`}
          />
          <span className="text-sm font-medium text-muted-foreground">
            {isListening ? "Listening..." : "Not listening"}
          </span>
          {isListening && (
            <button
              onClick={endConversation}
              className="px-4 py-2 border-2 border-foreground text-foreground rounded-lg text-sm font-bold hover:bg-foreground hover:text-background transition-colors"
            >
              End
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col p-4 max-w-4xl mx-auto w-full h-[calc(100vh-64px)]">
        {!isListening ? (
          // Start Screen
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2 text-foreground">
                Ready to Talk
              </h2>
              <p className="text-muted-foreground font-medium">
                Start listening and I'll help you communicate
              </p>
            </div>

            <button
              onClick={toggleListening}
              disabled={!dbUser?.elevenLabsVoiceId}
              className="px-8 py-4 bg-primary text-primary-foreground rounded-xl text-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center gap-3"
            >
              <Mic className="w-6 h-6" />
              {dbUser?.elevenLabsVoiceId
                ? "Start Listening"
                : "Complete Voice Setup First"}
            </button>

            {!dbUser?.elevenLabsVoiceId && (
              <a
                href="/onboarding/voice-setup"
                className="mt-4 text-primary font-bold hover:underline"
              >
                Set up your voice →
              </a>
            )}
          </div>
        ) : (
          // Active Conversation
          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
            {/* Transcript */}
            <TranscriptPanel
              entries={transcript}
              isSpeaking={isSpeaking}
              className="flex-1 min-h-0"
            />

            {/* Research Panel */}
            {isResearchOpen && researchQuery && (
              <ResearchPanel
                query={researchQuery}
                onComplete={handleResearchComplete}
                onClose={() => setIsResearchOpen(false)}
                className="shrink-0 max-h-[40vh]"
              />
            )}

            <div className="shrink-0 flex flex-col gap-4">
              {/* Smart Replies */}
              {isGeneratingReplies ? (
                <div className="text-center text-muted-foreground py-4">
                  <p className="text-sm font-medium">Generating replies...</p>
                </div>
              ) : (
                <SmartReplies
                  options={smartReplies}
                  onSelect={handleSelectReply}
                  onRegenerate={() => {
                    generateSmartReplies(transcript);
                  }}
                  className=""
                />
              )}

              {/* Custom Input */}
              <CustomInput
                onSubmit={handleCustomInput}
                onResearchTrigger={() => {
                  setResearchQuery("User requested research");
                  setIsResearchOpen(true);
                }}
                placeholder="Type something to say, or tap a quick reply above..."
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
