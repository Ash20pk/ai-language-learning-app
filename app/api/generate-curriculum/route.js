import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function extractJSONFromResponse(content) {
  const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
  if (jsonMatch && jsonMatch[1]) {
    return jsonMatch[1];
  }
  return content;
}

export async function POST(request) {
  try {
    const { language } = await request.json();

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that creates language learning curricula. Respond with valid JSON only, no additional text."
        },
        {
          role: "user",
          content: `Create a curriculum for learning ${language}. Provide a JSON array of 5 lessons, each with an 'id', 'title', and 'description'. Focus on speaking and listening skills. Respond with the JSON array only, no additional text or formatting.`
        }
      ],
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;

    const extractedContent = extractJSONFromResponse(content);

    let curriculum;

    try {
      curriculum = JSON.parse(extractedContent);
    } catch (jsonError) {
      console.error('Failed to parse JSON:', jsonError);
      throw new Error('Failed to parse the response as JSON');
    }

    if (!Array.isArray(curriculum)) {
      throw new Error('Curriculum is not an array');
    }

    return NextResponse.json(curriculum);
  } catch (error) {
    console.error('Error generating curriculum:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate curriculum', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }, 
      { status: 500 }
    );
  }
}