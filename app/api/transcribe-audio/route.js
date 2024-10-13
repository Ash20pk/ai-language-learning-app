import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import fs from 'fs';
import os from 'os';
import path from 'path';

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

    console.log('Received audio file:', audioFile.name, audioFile.type);

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Create a temporary file
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `audio-${Date.now()}.webm`);

    // Write the audio data to the temporary file
    const arrayBuffer = await audioFile.arrayBuffer();
    fs.writeFileSync(tempFilePath, Buffer.from(arrayBuffer));

    // Convert full language name to ISO-639-1 code
    const languageCode = languageMap[language.toLowerCase()] || 'en'; // Default to English if not found

    const response = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: 'whisper-1',
      language: languageCode,
    });

    // Delete the temporary file
    fs.unlinkSync(tempFilePath);

    if (!response || !response.text) {
      throw new Error('Invalid response from OpenAI API');
    }

    return NextResponse.json({ text: response.text });
  } catch (error) {
    console.error('Error transcribing audio:', error);
    return NextResponse.json({ error: 'Error transcribing audio: ' + error.message }, { status: 500 });
  }
}
