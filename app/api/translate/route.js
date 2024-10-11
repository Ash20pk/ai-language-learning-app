import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI(process.env.OPENAI_API_KEY);

export async function POST(req) {
  try {
    const { text, targetLanguage } = await req.json();

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: `You are a translator. Translate the following text to ${targetLanguage}. Maintain the original meaning and tone. only translate the text in double quotes` },
        { role: "user", content: text }
      ],
    });

    const translatedText = response.choices[0].message.content.trim();

    return NextResponse.json({ translatedText });
  } catch (error) {
    console.error('Error translating text:', error);
    return NextResponse.json({ error: 'Failed to translate text' }, { status: 500 });
  }
}