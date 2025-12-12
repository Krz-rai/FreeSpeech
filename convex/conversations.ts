import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const saveTranscript = mutation({
  args: {
    userId: v.id("users"),
    elevenLabsConversationId: v.optional(v.string()),
    entries: v.array(v.object({
      role: v.string(),
      text: v.string(),
      timestamp: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("conversationLogs", {
      userId: args.userId,
      elevenLabsConversationId: args.elevenLabsConversationId,
      entries: args.entries,
      startedAt: args.entries[0]?.timestamp || Date.now(),
      endedAt: Date.now(),
    });
  },
});

