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
  
  // Convex queries
  // Note: user?.id is the Clerk ID. getUser expects authId.
  const dbUser = useQuery(api.users.getUser, { authId: user?.id ?? "" });
  const saveTranscript = useMutation(api.conversations.saveTranscript);
  const recordReplySelection = useMutation(api.analytics.recordReplySelection);
  const createUser = useMutation(api.users.createUser);

  // Ensure user exists in Convex
  useEffect(() => {
    if (user && dbUser === null) {
        // Create user if not found (sync)
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
      console.log("Connected to ElevenLabs agent");
    },
    onDisconnect: () => {
      console.log("Disconnected from ElevenLabs agent");
    },
    onMessage: (message: any) => {
      // Handle different message types
      if (message.type === "user_transcript") {
        // This is what the OTHER person said (captured by mic)
        setTranscript(prev => [...prev, {
          role: "other",
          text: message.text,
          timestamp: Date.now()
        }]);
      } else if (message.type === "agent_response") {
        // This is what the agent is saying (user's voice)
        setTranscript(prev => [...prev, {
          role: "agent", 
          text: message.text,
          timestamp: Date.now()
        }]);
      }
    },
    onError: (error: any) => {
      console.error("Conversation error:", error);
    },
    
    // Client tools - executed locally
    clientTools: {
      // Smart Replies Generator
      generateSmartReplies: async ({ options, context_summary }: { options: SmartReply[], context_summary: string }) => {
        console.log("Agent generated smart replies:", options);
        setSmartReplies(options);
        return { success: true };
      },
      
      // Research Request Handler
      requestResearch: async ({ query, context }: { query: string, context: string }) => {
        console.log("Research requested:", query);
        setResearchQuery(query);
        setIsResearchOpen(true);
        
        // This will wait for user to complete research
        // Return results when research panel provides them
        return new Promise((resolve) => {
          // Store resolve function to call when research completes
          window.__researchResolve = resolve;
        });
      },
    },
  });

  // Start conversation with user's cloned voice
  const startConversation = async () => {
    if (!dbUser?.elevenLabsVoiceId) {
      alert("Please complete voice setup first");
      return;
    }

    try {
        let signedUrl = "";
        
        try {
            // Try to get signed URL for secure connection
            const response = await fetch("/api/elevenlabs/signed-url");
            if (!response.ok) {
                console.warn("Failed to get signed URL, falling back to public agent ID");
            } else {
                const data = await response.json();
                signedUrl = data.signedUrl;
            }
        } catch (err) {
            console.warn("Error fetching signed URL", err);
        }

        // Prepare connection options
        // If we have a signedUrl, we use it. 
        // If not, we fall back to using the agentId directly (requires public agent).
        const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID!;
        
        if (!agentId) {
            alert("Missing Agent ID configuration");
            return;
        }

        // We use dynamic overrides.
        // NOTE: If using signedUrl, the overrides must be signed too? 
        // Actually, normally overrides are passed during session start.
        // If the signed URL doesn't include overrides permissions, it might fail.
        // For Hackathon MVP, direct agentId is safer if signedUrl complexity is high.
        
        await conversation.startSession({
            agentId: agentId, // Always provide agentId just in case
            // @ts-ignore - The SDK types might be strict about one or the other
            signedUrl: signedUrl || undefined,
            
            // Override voice with user's cloned voice
            overrides: {
                tts: {
                voice_id: dbUser.elevenLabsVoiceId,
                },
            },
            
            // Inject user-specific context
            dynamicVariables: {
                user_name: dbUser.name || "Friend",
                communication_style: dbUser.communicationStyle || "warm and conversational",
                user_memories: dbUser.memories?.join(". ") || "No specific memories yet",
            },
        });
    } catch (e) {
        console.error("Failed to start conversation", e);
        alert("Failed to start conversation. Check console for details.");
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
    
    // Send as text message - agent will speak it
    await conversation.sendTextMessage(reply.text);
    
    // Clear replies
    setSmartReplies([]);
  };

  // Handle custom text input
  const handleCustomInput = async (text: string) => {
    await conversation.sendTextMessage(text);
    setSmartReplies([]);
  };

  // Handle research completion
  const handleResearchComplete = (results: string) => {
    setIsResearchOpen(false);
    setResearchQuery(null);
    
    // Resolve the promise from requestResearch tool
    if (window.__researchResolve) {
      window.__researchResolve({ results });
      delete window.__researchResolve;
    }
  };

  // End conversation
  const endConversation = async () => {
    await conversation.endSession();
    
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-xl font-bold">FreeSpeech</h1>
        <div className="flex items-center gap-4">
          <div className={`w-3 h-3 rounded-full ${
            conversation.status === "connected" ? "bg-green-500" : "bg-gray-300"
          }`} />
          <span className="text-sm text-gray-600">
            {conversation.status === "connected" ? "Connected" : "Disconnected"}
          </span>
          {conversation.status === "connected" && (
            <button
              onClick={endConversation}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200"
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
              <h2 className="text-3xl font-bold mb-2">Ready to Talk</h2>
              <p className="text-gray-600">
                Start a conversation and I'll help you communicate
              </p>
            </div>
            
            <button
              onClick={startConversation}
              disabled={!dbUser?.elevenLabsVoiceId}
              className="px-8 py-4 bg-blue-600 text-white rounded-xl text-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
            >
              {dbUser?.elevenLabsVoiceId 
                ? "Start Conversation" 
                : "Complete Voice Setup First"}
            </button>
            
            {!dbUser?.elevenLabsVoiceId && (
              <a 
                href="/onboarding/voice-setup" 
                className="mt-4 text-blue-600 hover:underline"
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
              isSpeaking={conversation.isSpeaking}
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
                    // Ask agent to regenerate
                    conversation.sendTextMessage("Please give me different reply options");
                }}
                className=""
                />
                
                {/* Custom Input */}
                <CustomInput
                onSubmit={handleCustomInput}
                onResearchTrigger={() => {
                    conversation.sendTextMessage("I need to research something");
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
