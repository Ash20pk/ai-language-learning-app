import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
  try {
    const { language, lessonTitle } = await req.json();

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that creates interactive language learning content. Respond with valid JSON only, no additional text."
        },
        {
          role: "user",
          content: `Create an interactive lesson for learning ${language} on the topic "${lessonTitle}". Provide a JSON object with the following structure:
          {
            "introduction": "Brief introduction to the lesson",
            "exercises": [
              {
                "type": "listen_and_repeat",
                "prompt": "Listen and repeat the following phrase",
                "phrase": "Phrase in ${language}",
                "translation": "English translation of the phrase"
              },
              {
                "type": "speak_and_check",
                "prompt": "Say the following phrase in ${language}",
                "phrase": "Phrase in English",
                "correctResponse": "Correct phrase in ${language}"
              }
            ]
          }
          Provide 5 exercises alternating between "listen_and_repeat" and "speak_and_check" types. Respond with the JSON object only, no additional text or formatting.`
        }
      ],
    });

    const content = response.choices[0].message.content;
    const lessonContent = JSON.parse(content);

    return NextResponse.json(lessonContent);
  } catch (error) {
    console.error('Error generating lesson content:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate lesson content', 
        details: error.message,
      }, 
      { status: 500 }
    );
  }
}