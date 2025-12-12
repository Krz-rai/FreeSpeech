import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const getUser = query({
  args: { authId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_authId", (q) => q.eq("authId", args.authId))
      .unique();
  },
});

export const createUser = mutation({
  args: {
    authId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_authId", (q) => q.eq("authId", args.authId))
      .unique();

    if (existing) return existing._id;

    return await ctx.db.insert("users", {
      authId: args.authId,
      email: args.email,
      name: args.name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const updatePreferences = mutation({
  args: {
    userId: v.id("users"),
    communicationStyle: v.optional(v.string()),
    memories: v.optional(v.array(v.string())),
    preferences: v.optional(v.object({
      speechRate: v.optional(v.number()),
      autoSpeak: v.optional(v.boolean()),
    })),
  },
  handler: async (ctx, args) => {
    const { userId, ...updates } = args;
    await ctx.db.patch(userId, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Internal mutation called by voice cloning action
export const setVoiceId = internalMutation({
  args: {
    userId: v.id("users"),
    voiceId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      elevenLabsVoiceId: args.voiceId,
      voiceCreatedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

