# FreeSpeech MVP – ElevenLabs Conversational AI 2.0

Real-time conversational co-pilot for mute users, powered by ElevenLabs Agent 2.0.

## Backend Setup

This project uses [Convex](https://convex.dev/) for the backend and [Next.js](https://nextjs.org/) for the frontend/API routes.

### 1. Prerequisites

- Node.js 18+
- Convex Account
- Clerk Account
- ElevenLabs Account (with Conversational AI 2.0 access)
- Google Cloud Account (for Places API) - Optional
- Tavily Account (for Web Search) - Optional

### 2. Environment Variables

Copy `env.example` to `.env.local` and fill in the values.

```bash
cp env.example .env.local
```

You need to set the following:

- **Auth**: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
- **Convex**: `NEXT_PUBLIC_CONVEX_URL` (automatically set by `npx convex dev`)
- **ElevenLabs**: `ELEVENLABS_API_KEY`, `NEXT_PUBLIC_ELEVENLABS_AGENT_ID`
- **Search Tools**: `TAVILY_API_KEY`, `GOOGLE_PLACES_API_KEY`

**Important**: 
1. Go to your Convex Dashboard -> Settings -> Environment Variables.
2. Add `CLERK_JWT_ISSUER_DOMAIN` with your Clerk Issuer URL (found in Clerk Dashboard -> API Keys -> Advanced -> Issuer).
3. Add `ELEVENLABS_API_KEY`, `TAVILY_API_KEY`, `GOOGLE_PLACES_API_KEY` to Convex Environment Variables if you plan to use them in Convex Actions (currently `ELEVENLABS_API_KEY` is used in `convex/voice.ts`).

### 3. ElevenLabs Agent Setup

1. Go to [ElevenLabs Conversational AI](https://elevenlabs.io/app/conversational-ai).
2. Create a new Agent.
3. Configure the **System Prompt** as per the `agentConfig.system_prompt` in the project documentation.
4. Add **Client Tools**:
   - `generateSmartReplies`
   - `requestResearch`
   (See documentation for schemas)
5. Add **Server Tools** (Webhooks):
   - `webSearch`: Point to your deployed URL `/api/tools/web-search`
   - `findRestaurants`: Point to your deployed URL `/api/tools/restaurants`
   *Note: For local development, use a tunneling service like ngrok to expose your localhost:3000 to ElevenLabs.*
6. Copy the **Agent ID** to your `.env.local` as `NEXT_PUBLIC_ELEVENLABS_AGENT_ID`.

### 4. Running the App

```bash
npm install
npm run dev
```

This will start both the Next.js frontend (localhost:3000) and Convex backend.

### 5. Backend Structure

- **`convex/schema.ts`**: Database schema (Users, VoiceSamples, ConversationLogs).
- **`convex/users.ts`**: User management and preferences.
- **`convex/voice.ts`**: Voice cloning logic (uploads samples to ElevenLabs).
- **`convex/conversations.ts`**: Saves conversation transcripts.
- **`app/api/tools/`**: Server tools for the ElevenLabs agent.
