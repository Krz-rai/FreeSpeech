import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    authId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    
    // Voice
    elevenLabsVoiceId: v.optional(v.string()),
    voiceCreatedAt: v.optional(v.number()),
    
    // Personalization
    communicationStyle: v.optional(v.string()),
    memories: v.optional(v.array(v.string())),
    
    // Settings
    preferences: v.optional(v.object({
      speechRate: v.optional(v.number()),
      autoSpeak: v.optional(v.boolean()),
    })),
    
    consentGivenAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_authId", ["authId"]),

  voiceSamples: defineTable({
    userId: v.id("users"),
    storageId: v.id("_storage"),
    filename: v.string(),
    durationSeconds: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"]),

  conversationLogs: defineTable({
    userId: v.id("users"),
    elevenLabsConversationId: v.optional(v.string()),
    entries: v.array(v.object({
      role: v.string(),
      text: v.string(),
      timestamp: v.number(),
    })),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"]),

  replySelections: defineTable({
    userId: v.id("users"),
    selectedText: v.string(),
    category: v.string(),
    allOptions: v.array(v.object({
      id: v.string(),
      text: v.string(),
      category: v.string(),
    })),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"]),
});
