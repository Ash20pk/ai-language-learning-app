import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import fs from 'fs';  // For reading the JSON file
import path from 'path'; // To construct file paths

const openai = new OpenAI(process.env.OPENAI_API_KEY);

// Load the language-codes JSON file asynchronously once when the module is loaded
let languageCodes = [];

try {
  const filePath = path.join(process.cwd(), 'language_codes.json'); // Adjust the path if needed
  const data = fs.readFileSync(filePath, 'utf8');
  languageCodes = JSON.parse(data); // Parse JSON array
} catch (err) {
  console.error("Error reading language codes file:", err);
}

export async function POST(req) {
  try {
    const { text, language } = await req.json();

    // Log the input language for debugging
    console.log(`Generating audio for text in language: ${language}`);

    // Select the appropriate voice based on the language
    const voice = 'alloy';  // You could enhance this logic to dynamically choose the voice based on language

    // Convert full language name to ISO-639-1 code using the JSON data
    const languageCode = languageCodes.find(
      (entry) => entry.English.toLowerCase() === language.toLowerCase()
    )?.alpha2 || 'en';  // Default to 'en' for English if not found

    if (languageCode === 'en') {
      console.warn(`Language "${language}" not found in language codes. Defaulting to "en".`);
    }

    // Determine if the input is a single word or a phrase
    const words = text.trim().split(/\s+/);
    let slowedText;

    if (words.length === 1) {
      // For a single word, add slight pauses between syllables
      slowedText = words[0].split('').join('.');
    } else {
      // For phrases, add pauses between words
      slowedText = words.join(' . ');
    }

    // Generate the audio using OpenAI TTS
    const response = await openai.audio.speech.create({
      model: "tts-1",
      voice: voice,
      input: slowedText,
      language: languageCode,
      response_format: "opus",
    });

    // Convert the response to an audio buffer
    const audioBuffer = Buffer.from(await response.arrayBuffer());

    // Return the audio buffer with the correct MIME type for Opus audio
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/opus',
      },
    });
  } catch (error) {
    console.error('Error generating audio:', error);
    return NextResponse.json({ error: 'Failed to generate audio' }, { status: 500 });
  }
}
