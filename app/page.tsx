"use client";

import { Authenticated, Unauthenticated } from "convex/react";
import { SignInButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ArrowRight, MessageSquare, Mic, Smartphone } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="p-6 flex justify-between items-center max-w-6xl mx-auto w-full">
        <h1 className="text-2xl font-bold text-blue-900">FreeSpeech</h1>
        <Unauthenticated>
          <SignInButton mode="modal">
            <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
              Sign In
            </button>
          </SignInButton>
        </Unauthenticated>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-6 pt-20 pb-32 flex flex-col items-center text-center">
        <div className="inline-block px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold mb-8">
          Powered by ElevenLabs Conversational AI 2.0
        </div>
        
        <h2 className="text-5xl md:text-7xl font-extrabold text-gray-900 mb-8 tracking-tight">
          Your Voice, <span className="text-blue-600">Reimagined</span>
        </h2>
        
        <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mb-12 leading-relaxed">
          A real-time conversational co-pilot for mute users. 
          Listen, think, and speak with your own AI voice clone in milliseconds.
        </p>

        <Authenticated>
          <RedirectToApp />
        </Authenticated>
        
        <Unauthenticated>
           <SignInButton mode="modal">
            <button className="group px-8 py-4 bg-blue-600 text-white rounded-xl text-xl font-bold hover:bg-blue-700 transition-all flex items-center gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-1">
              Get Started
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </SignInButton>
        </Unauthenticated>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-32 w-full text-left">
          <FeatureCard 
            icon={<Mic className="w-8 h-8 text-blue-500" />}
            title="Voice Cloning"
            description="Upload a few minutes of audio to create a digital twin of your natural voice."
          />
          <FeatureCard 
            icon={<MessageSquare className="w-8 h-8 text-purple-500" />}
            title="Smart Replies"
            description="AI analyzes the conversation and suggests relevant responses in real-time."
          />
          <FeatureCard 
            icon={<Smartphone className="w-8 h-8 text-green-500" />}
            title="Conversational AI"
            description="Full turn-taking, interruption handling, and emotional expression built-in."
          />
        </div>
      </main>
      
      <footer className="bg-gray-50 border-t py-12 text-center text-gray-500 text-sm">
        <p>© 2025 FreeSpeech MVP. Built for the ElevenLabs Hackathon.</p>
      </footer>
    </div>
  );
}

function RedirectToApp() {
  const router = useRouter();
  
  useEffect(() => {
    router.push("/conversation");
  }, [router]);

  return (
    <button 
      onClick={() => router.push("/conversation")}
      className="px-8 py-4 bg-blue-600 text-white rounded-xl text-xl font-bold flex items-center gap-3 animate-pulse"
    >
      Launching App...
      <ArrowRight className="w-5 h-5" />
    </button>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="mb-4 bg-gray-50 w-16 h-16 rounded-xl flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}
