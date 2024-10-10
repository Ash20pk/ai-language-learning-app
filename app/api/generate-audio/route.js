import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI(process.env.OPENAI_API_KEY);

export async function POST(req) {
  try {
    const { text, language } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    const response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy', // You can change this to other available voices
      input: text,
    });

    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    });
  } catch (error) {
    console.error('Error generating audio:', error);
    return NextResponse.json({ error: 'Error generating audio' }, { status: 500 });
  }
}