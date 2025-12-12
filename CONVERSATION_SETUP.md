# FreeSpeech Conversation System

## Architecture

The conversation system is designed for **assisted communication** where the user (with speech impairment) needs to approve every response before it's spoken.

### Flow

1. **User1 speaks** → Web Speech API (STT) transcribes
2. **Transcript is sent to OpenAI** → Generates 3 smart reply options
3. **User sees options** → Selects one (or types custom text)
4. **ElevenLabs TTS** → Speaks the selected reply in user's cloned voice
5. **Repeat**

### Key Components

#### 1. Speech-to-Text (STT)
- **Technology**: Browser's Web Speech API
- **Location**: `app/(app)/conversation/page.tsx`
- **How it works**: Continuously listens to User1 and transcribes speech in real-time
- **Supported browsers**: Chrome, Edge, Safari (with webkit prefix)

#### 2. Smart Reply Generation
- **Technology**: OpenAI GPT-4
- **Location**: `app/api/generate-replies/route.ts`
- **How it works**: 
  - Takes conversation transcript as context
  - Generates 3 semantically distinct reply options
  - Categories: affirmative, question, informational
  - Keeps replies under 15 words for natural speech

#### 3. Text-to-Speech (TTS)
- **Technology**: ElevenLabs TTS API
- **Location**: `app/(app)/conversation/page.tsx` (speakText function)
- **How it works**: 
  - Uses user's cloned voice ID from Convex database
  - Converts selected text to speech
  - Plays audio in browser
  - Only speaks when user explicitly selects a reply

## Environment Variables

Add these to your `.env.local` file:

```bash
# OpenAI (for smart reply generation)
OPENAI_API_KEY=sk-...

# ElevenLabs (for TTS)
NEXT_PUBLIC_ELEVENLABS_API_KEY=sk-...

# Existing variables (Clerk, Convex, etc.)
# ...see env.example
```

## Setup Steps

1. **Install dependencies** (already done):
   ```bash
   npm install openai elevenlabs
   ```

2. **Add API keys**:
   - Get OpenAI API key from https://platform.openai.com/api-keys
   - Get ElevenLabs API key from https://elevenlabs.io/
   - Add them to `.env.local`

3. **Complete voice setup**:
   - Navigate to `/onboarding/voice-setup`
   - Clone your voice using ElevenLabs
   - Voice ID is saved to Convex database

4. **Start the app**:
   ```bash
   npm run dev
   ```

5. **Test the conversation**:
   - Click "Start Listening"
   - Allow microphone permissions
   - Speak (as User1) and watch smart replies appear
   - Click a reply to hear it spoken in your voice

## Browser Compatibility

- **Speech Recognition**: Chrome, Edge, Safari
- **Audio Playback**: All modern browsers
- **Microphone Access**: Requires HTTPS (or localhost)

## Troubleshooting

### "Speech recognition not supported"
- Use Chrome, Edge, or Safari
- Check browser console for errors

### "TTS request failed"
- Verify `NEXT_PUBLIC_ELEVENLABS_API_KEY` is set
- Check voice setup is complete
- Verify API key has TTS permissions

### Smart replies not generating
- Verify `OPENAI_API_KEY` is set
- Check browser console for API errors
- Verify API key has GPT-4 access

### No audio plays
- Check browser audio permissions
- Ensure audio is not muted
- Check browser console for playback errors

## Differences from Agent-Based Approach

### Old (Agent-Based)
- ❌ Agent responds automatically
- ❌ Hard to control when agent speaks
- ❌ Built for conversational AI, not assisted communication

### New (STT/TTS with Tool Call)
- ✅ User has full control
- ✅ Only speaks when user selects a reply
- ✅ Designed for assisted communication
- ✅ Clear, predictable flow

## Future Enhancements

- [ ] Add keyboard shortcuts (1, 2, 3 for quick reply selection)
- [ ] Support for multiple languages
- [ ] Offline mode with fallback TTS
- [ ] Voice activity detection for better STT
- [ ] Custom reply templates
- [ ] Conversation history search
