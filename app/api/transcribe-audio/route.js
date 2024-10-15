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
    const correctPhrase = formData.get('correctPhrase'); // Add this line

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

    const transcribedText = response.text;

    // Use GPT-3.5 to check the answer
    const checkResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a language learning assistant. Your task is to compare the transcribed text with the correct phrase and determine if they match in pronouncation, again do check for phonetic equivalence not just meaning. Provide feedback on the answer in one line or less. If the phrases are not equivalent, respond in format: Not quite right. It should be [correct phrase with phonetic sound of the correct phrase like Hello (heh-loh) ]. Don't forget to replace anything under [] accordingly and don't repeat the instructions I am giving you. If the phrases are equivalent, respond in format: Excellent! Correct. Good job."
        },
        {
          role: "user",
          content: `Correct phrase: "${correctPhrase}"\nTranscribed text: "${transcribedText}"\nLanguage: ${language}\n\nAre these phrases equivalent in pronouncation? Provide feedback.`
        }
      ]
    });

    const feedback = checkResponse.choices[0].message.content;

    return NextResponse.json({ 
      transcribedText, 
      feedback,
      isCorrect: feedback.toLowerCase().includes("correct") || feedback.toLowerCase().includes("equivalent")
    });
  } catch (error) {
    console.error('Error processing audio:', error);
    return NextResponse.json({ error: 'Error processing audio: ' + error.message }, { status: 500 });
  }
}
