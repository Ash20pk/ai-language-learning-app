import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
  try {
    const { text } = await req.json();

    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: "alloy",
      input: text,
    });

    // Convert the ReadableStream to a Uint8Array
    const chunks = [];
    for await (const chunk of mp3.body) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Set the appropriate headers for audio streaming
    const headers = new Headers();
    headers.set('Content-Type', 'audio/mpeg');
    headers.set('Content-Length', buffer.length.toString());

    return new NextResponse(buffer, { status: 200, headers });
  } catch (error) {
    console.error('Error generating audio:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate audio', 
        details: error.message,
      }, 
      { status: 500 }
    );
  }
}