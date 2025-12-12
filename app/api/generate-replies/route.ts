import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { transcript, userName, communicationStyle } = await request.json();

    if (!transcript || !Array.isArray(transcript)) {
      return NextResponse.json(
        { error: "Invalid transcript format" },
        { status: 400 }
      );
    }

    // Build conversation context
    const conversationContext = transcript
      .slice(-10) // Last 10 messages
      .map((entry: any) => {
        const speaker = entry.role === "agent" ? userName : "Partner";
        return `${speaker}: ${entry.text}`;
      })
      .join("\n");

    const lastMessage = transcript[transcript.length - 1];
    if (lastMessage.role === "agent") {
      // Don't generate replies if we just spoke
      return NextResponse.json({ replies: [] });
    }

    // Generate smart replies using OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are helping ${userName} communicate in a conversation. Generate 3 short, natural reply options that ${userName} could say in response to what they just heard.

Communication style: ${communicationStyle || "warm and conversational"}

Rules:
- Keep each reply under 15 words
- Make them semantically distinct from each other
- Match the communication style
- Be contextually appropriate
- One should be affirmative/agreeing
- One should be a question/clarification
- One should be informational/conversational

Return ONLY a JSON array of 3 objects with this format:
[
  {"id": "1", "text": "reply text", "category": "affirmative"},
  {"id": "2", "text": "reply text", "category": "question"},
  {"id": "3", "text": "reply text", "category": "informational"}
]`,
        },
        {
          role: "user",
          content: `Recent conversation:\n${conversationContext}\n\nGenerate 3 reply options for ${userName}.`,
        },
      ],
      temperature: 0.8,
      max_tokens: 300,
    });

    const responseText = completion.choices[0].message.content || "[]";
    
    // Parse the JSON response
    let replies;
    try {
      replies = JSON.parse(responseText);
    } catch (e) {
      // If parsing fails, extract JSON from markdown code blocks
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        replies = JSON.parse(jsonMatch[1]);
      } else {
        console.error("Failed to parse OpenAI response:", responseText);
        replies = [];
      }
    }

    return NextResponse.json({ replies: replies.slice(0, 3) });
  } catch (error: any) {
    console.error("Error generating replies:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate replies" },
      { status: 500 }
    );
  }
}
