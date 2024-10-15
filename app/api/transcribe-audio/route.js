import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import fs from 'fs';  // For reading the JSON file
import path from 'path'; // To construct file paths

const openai = new OpenAI(process.env.OPENAI_API_KEY);

// Load the language-codes JSON file once when the module is loaded
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
    const formData = await req.formData();
    const audioFile = formData.get('audio');
    const language = formData.get('language');
    const correctPhrase = formData.get('correctPhrase'); 

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Convert the file to a Buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create a File object from the buffer
    const file = new File([buffer], audioFile.name, { type: audioFile.type });

     // Convert full language name to ISO-639-1 code using the JSON data
     const languageCode = languageCodes.find(
      (entry) => entry.English.toLowerCase() === language.toLowerCase())?.alpha2 || 'en';  // Default to 'en' for English if not found

    const response = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: languageCode,
    });

    const transcribedText = response.text;

    // Use GPT-4o to check the answer
    const checkResponse = await openai.chat.completions.create({
      model: "gpt-4o",
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
