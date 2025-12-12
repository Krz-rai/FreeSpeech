"use client";

import { useState } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Loader2, Upload, Mic } from "lucide-react";
import { useQuery } from "convex/react";

export default function VoiceSetupPage() {
  const { user } = useUser();
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  
  // Convex mutations/actions
  const generateUploadUrl = useMutation(api.voice.generateUploadUrl);
  const saveVoiceSample = useMutation(api.voice.saveVoiceSample);
  const createVoiceClone = useAction(api.voice.createVoiceClone);
  
  // Get current user to check if they already have a voice
  const dbUser = useQuery(api.users.getUser, { authId: user?.id ?? "" });
  const samples = useQuery(api.voice.getUserSamples, dbUser ? { userId: dbUser._id } : "skip") || [];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !dbUser) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        // 1. Get secure upload URL
        const postUrl = await generateUploadUrl();
        
        // 2. Upload file
        const result = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        
        if (!result.ok) throw new Error("Upload failed");
        
        const { storageId } = await result.json();
        
        // 3. Save metadata
        await saveVoiceSample({
          userId: dbUser._id,
          storageId,
          filename: file.name,
          durationSeconds: 0, // Would need audio analysis to get real duration
        });
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload samples");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateClone = async () => {
    if (!dbUser) return;
    
    setIsCloning(true);
    try {
      await createVoiceClone({ userId: dbUser._id });
      router.push("/conversation");
    } catch (error) {
      console.error("Cloning error:", error);
      alert("Failed to create voice clone. Make sure you have enough samples.");
    } finally {
      setIsCloning(false);
    }
  };

  if (!dbUser) return <div className="p-8 text-center">Loading user profile...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Voice Setup</h1>
          <p className="text-gray-600">
            Upload voice samples to create your personal AI voice clone.
          </p>
        </div>

        {/* Existing Samples */}
        <div className="mb-8">
            <h3 className="font-medium text-gray-700 mb-4">Your Samples ({samples.length})</h3>
            {samples.length === 0 ? (
                <div className="text-center p-6 border-2 border-dashed rounded-lg text-gray-400 bg-gray-50">
                    No samples uploaded yet
                </div>
            ) : (
                <div className="space-y-2 mb-4">
                    {samples.map((sample: any) => (
                        <div key={sample._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                            <span className="truncate flex-1">{sample.filename}</span>
                            <span className="text-gray-400 text-xs">Uploaded</span>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* Upload Button */}
        <div className="mb-8">
          <label className={`
            flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer
            hover:bg-gray-50 transition-colors
            ${isUploading ? "opacity-50 cursor-not-allowed" : "border-blue-200 bg-blue-50"}
          `}>
            {isUploading ? (
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            ) : (
              <>
                <Upload className="w-8 h-8 text-blue-600 mb-2" />
                <span className="text-sm font-medium text-blue-600">
                  Click to upload audio files
                </span>
                <span className="text-xs text-blue-400 mt-1">
                  MP3, WAV, M4A (min 1 min total recommended)
                </span>
              </>
            )}
            <input 
              type="file" 
              multiple 
              accept="audio/*" 
              className="hidden" 
              onChange={handleFileUpload}
              disabled={isUploading}
            />
          </label>
        </div>

        {/* Action Button */}
        <button
          onClick={handleCreateClone}
          disabled={samples.length === 0 || isCloning || isUploading}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isCloning ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Cloning Voice...
            </>
          ) : (
            <>
              <Mic className="w-5 h-5" />
              Create Voice Clone
            </>
          )}
        </button>
        
        <p className="text-xs text-gray-400 mt-4 text-center">
            This process takes about 1-2 minutes.
        </p>
      </div>
    </div>
  );
}

