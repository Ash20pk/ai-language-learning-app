import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI(process.env.OPENAI_API_KEY);

// Map full language names to ISO-639-1 codes
const languageMap = {
  'english': 'en',
  'spanish': 'es',
  'french': 'fr',
  'german': 'de',
  'italian': 'it',
  'portuguese': 'pt',
  'russian': 'ru',
  'japanese': 'ja',
  'korean': 'ko',
  'chinese': 'zh',
  // Add more languages as needed
};

export async function POST(req) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio');
    const language = formData.get('language');

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Convert the file to a Buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create a File object from the buffer
    const file = new File([buffer], audioFile.name, { type: audioFile.type });

    // Convert full language name to ISO-639-1 code
    const languageCode = languageMap[language.toLowerCase()] || 'en'; // Default to English if not found

    const response = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: languageCode,
    });

    return NextResponse.json({ text: response.text });
  } catch (error) {
    console.error('Error transcribing audio:', error);
    return NextResponse.json({ error: 'Error transcribing audio: ' + error.message }, { status: 500 });
  }
}