import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const recordReplySelection = mutation({
  args: {
    userId: v.id("users"),
    selectedText: v.string(),
    category: v.string(),
    allOptions: v.array(v.object({
      id: v.string(),
      text: v.string(),
      category: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("replySelections", {
      userId: args.userId,
      selectedText: args.selectedText,
      category: args.category,
      allOptions: args.allOptions,
      createdAt: Date.now(),
    });
  },
});

