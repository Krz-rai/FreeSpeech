import { NextRequest, NextResponse } from "next/server";
import { ElevenLabsClient } from "elevenlabs";

export async function GET(request: NextRequest) {
  const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!agentId || !apiKey) {
    console.error("Missing configuration: agentId or apiKey is null");
    return NextResponse.json(
      { error: "Missing configuration" },
      { status: 500 }
    );
  }

  try {
    const client = new ElevenLabsClient({ apiKey });
    
    try {
        // Updated to use the correct SDK method for conversational AI signed URL
        const result = await client.conversationalAi.getSignedUrl({ agent_id: agentId });
        return NextResponse.json({ signedUrl: result.signed_url });
    } catch (sdkError: any) {
        console.warn("SDK getSignedUrl failed, falling back to fetch:", sdkError);
        
        // Fallback to fetch if SDK fails
        const response = await fetch(
            `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
            {
                method: "GET",
                headers: {
                "xi-api-key": apiKey,
                },
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`ElevenLabs API Error: ${errorText}`);
        }

        const data = await response.json();
        return NextResponse.json({ signedUrl: data.signed_url });
    }
  } catch (error: any) {
    console.error("Error getting signed URL:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
