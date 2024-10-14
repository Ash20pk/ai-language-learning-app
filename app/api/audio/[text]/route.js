import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI(process.env.OPENAI_API_KEY);

const languageVoiceMap = {
  'en': 'alloy',
  'es': 'nova',
  'fr': 'nova',
  'de': 'nova',
  'it': 'nova',
  'pt': 'nova',
  'ja': 'nova',
  'ko': 'nova',
  'zh': 'nova',
};

export async function GET(request, { params }) {
  const text = decodeURIComponent(params.text);
  const { searchParams } = new URL(request.url);
  const language = searchParams.get('lang') || 'en';

  try {
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
