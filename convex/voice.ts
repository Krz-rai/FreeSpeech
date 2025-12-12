import { action, query, internalQuery, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

export const saveVoiceSample = mutation({
  args: {
    userId: v.id("users"),
    storageId: v.id("_storage"),
    filename: v.string(),
    durationSeconds: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("voiceSamples", {
      userId: args.userId,
      storageId: args.storageId,
      filename: args.filename,
      durationSeconds: args.durationSeconds,
      createdAt: Date.now(),
    });
  },
});

// Public query for the frontend
export const getUserSamples = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("voiceSamples")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

// Internal query for the action
export const internalGetUserSamples = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("voiceSamples")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const createVoiceClone = action({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // 1. Get voice samples
    const samples = await ctx.runQuery(internal.voice.internalGetUserSamples, {
      userId: args.userId,
    });

    if (samples.length === 0) {
      throw new Error("No voice samples found");
    }

    // 2. Prepare FormData with audio files
    const formData = new FormData();
    formData.append("name", `FreeSpeech_${args.userId}`);
    formData.append("description", "Voice clone for FreeSpeech app");

    for (const sample of samples) {
      const url = await ctx.storage.getUrl(sample.storageId);
      if (url) {
        const response = await fetch(url);
        const blob = await response.blob();
        formData.append("files", blob, sample.filename);
      }
    }

    // 3. Call ElevenLabs voice cloning API
    const response = await fetch("https://api.elevenlabs.io/v1/voices/add", {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY!,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Voice cloning failed: ${errorText}`);
    }

    const { voice_id } = await response.json();

    // 4. Save to user record
    await ctx.runMutation(internal.users.setVoiceId, {
      userId: args.userId,
      voiceId: voice_id,
    });

    return { voiceId: voice_id };
  },
});
