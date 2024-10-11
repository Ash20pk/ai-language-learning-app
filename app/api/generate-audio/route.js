import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI(process.env.OPENAI_API_KEY);

// Define a mapping of languages to appropriate voices
const languageVoiceMap = {
  'en': 'alloy', // English
  'es': 'nova',  // Spanish
  'fr': 'nova',  // French
  'de': 'nova',  // German
  'it': 'nova',  // Italian
  'pt': 'nova',  // Portuguese
  'ja': 'nova',  // Japanese
  'ko': 'nova',  // Korean
  'zh': 'nova',  // Chinese
  // Add more languages and corresponding voices as needed
};

export async function POST(req) {
  try {
    const { text, language } = await req.json();

    // Select the appropriate voice based on the language
    const voice = languageVoiceMap[language] || 'alloy';

    const response = await openai.audio.speech.create({
      model: "tts-1",
      voice: voice,
      input: text,
      language: language,
    });

    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    });
  } catch (error) {
    console.error('Error generating audio:', error);
    return NextResponse.json({ error: 'Failed to generate audio' }, { status: 500 });
  }
}