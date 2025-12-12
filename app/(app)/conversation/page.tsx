"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { useConversation } from "@elevenlabs/react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { TranscriptPanel } from "@/components/conversation/transcript-panel";
import { SmartReplies } from "@/components/conversation/smart-replies";
import { CustomInput } from "@/components/conversation/custom-input";
import { ResearchPanel } from "@/components/conversation/research-panel";

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
  const [isMuted, setIsMuted] = useState(true); // Agent is MUTED by default
  const pendingReplyRef = useRef<string | null>(null); // Track what we're expecting agent to say
  
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
  
  // ElevenLabs Conversation Hook
  const conversation = useConversation({
    onConnect: () => {
      console.log("✅ Connected to ElevenLabs agent");
      // Mute agent immediately on connect
      conversation.setVolume({ volume: 0 });
      console.log("🔇 Agent muted on connect");
    },
    onDisconnect: () => {
      console.log("❌ Disconnected from ElevenLabs agent");
    },
    onMessage: (message: any) => {
      console.log("📩 Message received:", message);
      
      if (message.type === "user_transcript") {
        // User1 spoke - add to transcript
        setTranscript(prev => [...prev, {
          role: "other",
          text: message.text,
          timestamp: Date.now()
        }]);
      } else if (message.type === "agent_response") {
        // Agent responded - only add if we have a pending reply
        if (pendingReplyRef.current) {
          setTranscript(prev => [...prev, {
            role: "agent", 
            text: pendingReplyRef.current!,
            timestamp: Date.now()
          }]);
          pendingReplyRef.current = null;
        }
      }
    },
    onError: (error: any) => {
      console.error("🚨 Conversation error:", error);
    },
    
    clientTools: {
      generateSmartReplies: async (params: any) => {
        console.log("🎯 generateSmartReplies CALLED!", params);
        
        // IMMEDIATELY interrupt any pending speech and mute
        try {
          conversation.interrupt();
          conversation.setVolume({ volume: 0 });
          console.log("🔇 Interrupted and muted after generating replies");
        } catch (e) {
          console.warn("Could not interrupt/mute:", e);
        }
        
        const { options } = params;
        let parsedOptions: SmartReply[] = [];

        try {
          parsedOptions = typeof options === "string" ? JSON.parse(options) : options;
        } catch (err) {
          console.error("Failed to parse smart reply options:", err);
          return { success: false };
        }

        if (!Array.isArray(parsedOptions)) {
          console.warn("Smart replies not an array:", parsedOptions);
          return { success: false };
        }

        const trimmed = parsedOptions.slice(0, 3);
        console.log("✅ Setting smart replies:", trimmed);
        setSmartReplies(trimmed);

        return { success: true };
      },
      
      requestResearch: async (params: any) => {
        console.log("🔍 requestResearch CALLED!", params);
        const { query } = params;
        setResearchQuery(query);
        setIsResearchOpen(true);
        
        return new Promise((resolve) => {
          window.__researchResolve = resolve;
        });
      },
    },
  });

  // Watch for isSpeaking changes - mute when finished speaking
  useEffect(() => {
    if (!conversation.isSpeaking && pendingReplyRef.current === null) {
      // Agent stopped speaking and no pending reply - ensure muted
      try {
        conversation.setVolume({ volume: 0 });
      } catch (e) {
        // Ignore if not connected
      }
    }
  }, [conversation.isSpeaking]);

  // Start conversation
  const startConversation = async () => {
    if (!dbUser?.elevenLabsVoiceId) {
      alert("Please complete voice setup first");
      return;
    }

    try {
        let signedUrl = "";
        
        try {
            const response = await fetch("/api/elevenlabs/signed-url");
            if (response.ok) {
                const data = await response.json();
                signedUrl = data.signedUrl;
            }
        } catch (err) {
            console.warn("Error fetching signed URL", err);
        }

        const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID!;
        
        if (!agentId) {
            alert("Missing Agent ID configuration");
            return;
        }
        
        await conversation.startSession({
            agentId: agentId,
            // @ts-ignore
            signedUrl: signedUrl || undefined,
            overrides: {
                tts: {
                  voice_id: dbUser.elevenLabsVoiceId,
                },
            },
            dynamicVariables: {
                user_name: dbUser.name || "Friend",
                communication_style: dbUser.communicationStyle || "warm and conversational",
                user_memories: dbUser.memories?.join(". ") || "No specific memories yet",
            },
        });
        
        // Mute immediately after starting
        setTimeout(() => {
          conversation.setVolume({ volume: 0 });
          setIsMuted(true);
          console.log("🔇 Muted after session start");
        }, 100);
        
    } catch (e) {
        console.error("Failed to start conversation", e);
        alert("Failed to start conversation. Check console for details.");
    }
  };

  // Handle smart reply selection - THIS is when agent should speak
  const handleSelectReply = async (reply: SmartReply) => {
    // Record selection
    if (dbUser?._id) {
        await recordReplySelection({
            userId: dbUser._id,
            selectedText: reply.text,
            category: reply.category,
            allOptions: smartReplies,
        });
    }
    
    // Store what we expect the agent to say
    pendingReplyRef.current = reply.text;
    
    // UNMUTE so we can hear the agent
    conversation.setVolume({ volume: 1 });
    setIsMuted(false);
    console.log("🔊 Unmuted for reply:", reply.text);
    
    // Send the message - agent will speak it
    await conversation.sendUserMessage(reply.text);
    
    // Clear replies
    setSmartReplies([]);
    
    // Re-mute after a delay (give time for agent to speak)
    setTimeout(() => {
      if (!conversation.isSpeaking) {
        conversation.setVolume({ volume: 0 });
        setIsMuted(true);
        console.log("🔇 Re-muted after reply");
      }
    }, 5000);
  };

  // Handle custom text input
  const handleCustomInput = async (text: string) => {
    // Store what we expect
    pendingReplyRef.current = text;
    
    // Unmute
    conversation.setVolume({ volume: 1 });
    setIsMuted(false);
    console.log("🔊 Unmuted for custom input:", text);
    
    await conversation.sendUserMessage(text);
    setSmartReplies([]);
    
    // Re-mute after delay
    setTimeout(() => {
      if (!conversation.isSpeaking) {
        conversation.setVolume({ volume: 0 });
        setIsMuted(true);
      }
    }, 5000);
  };

  // Handle research completion
  const handleResearchComplete = (results: string) => {
    setIsResearchOpen(false);
    setResearchQuery(null);
    
    if (window.__researchResolve) {
      window.__researchResolve({ results });
      delete window.__researchResolve;
    }
  };

  // End conversation
  const endConversation = async () => {
    await conversation.endSession();
    
    if (transcript.length > 0 && dbUser?._id) {
      await saveTranscript({
        userId: dbUser._id,
        entries: transcript,
      });
    }
    
    setTranscript([]);
    setSmartReplies([]);
    setIsMuted(true);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-background border-b-2 border-border px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-xl font-bold text-foreground">FreeSpeech</h1>
        <div className="flex items-center gap-4">
          {/* Mute indicator */}
          {conversation.status === "connected" && (
            <span className={`text-xs font-bold px-2 py-1 rounded ${isMuted ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground'}`}>
              {isMuted ? '🔇 Waiting' : '🔊 Speaking'}
            </span>
          )}
          <div className={`w-3 h-3 rounded-full border-2 border-foreground ${
            conversation.status === "connected" ? "bg-foreground" : "bg-background"
          }`} />
          <span className="text-sm font-medium text-muted-foreground">
            {conversation.status === "connected" ? "Connected" : "Disconnected"}
          </span>
          {conversation.status === "connected" && (
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
        {conversation.status !== "connected" ? (
          // Start Screen
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2 text-foreground">Ready to Talk</h2>
              <p className="text-muted-foreground font-medium">
                Start a conversation and I'll help you communicate
              </p>
            </div>
            
            <button
              onClick={startConversation}
              disabled={!dbUser?.elevenLabsVoiceId}
              className="px-8 py-4 bg-primary text-primary-foreground rounded-xl text-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
            >
              {dbUser?.elevenLabsVoiceId 
                ? "Start Conversation" 
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
              isSpeaking={conversation.isSpeaking && !isMuted}
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
                <SmartReplies
                options={smartReplies}
                onSelect={handleSelectReply}
                onRegenerate={() => {
                    conversation.sendUserMessage("Please give me different reply options");
                    setSmartReplies([]);
                }}
                className=""
                />
                
                {/* Custom Input */}
                <CustomInput
                onSubmit={handleCustomInput}
                onResearchTrigger={() => {
                    conversation.sendUserMessage("I need to research something");
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

// Type declaration for research resolve
declare global {
  interface Window {
    __researchResolve?: (result: { results: string }) => void;
  }
}
