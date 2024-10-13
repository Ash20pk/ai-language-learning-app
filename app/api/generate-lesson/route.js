import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { verifyToken } from '../../lib/auth';
import { connectToDatabase } from '../../lib/mongodb';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
  try {
    const token = req.headers.get('Authorization')?.split(' ')[1];
    const userId = await verifyToken(token);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { language, lessonTitle, curriculumId, lessonId } = await req.json();

    const { db } = await connectToDatabase();

    // Check if lesson already exists
    const existingLesson = await db.collection('lessons').findOne({
      curriculumId,
      lessonId
    });

    if (existingLesson) {
      return NextResponse.json(existingLesson);
    }

    // Generate new lesson content
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that creates interactive language learning content. Respond with valid JSON only, no additional text."
        },
        {
          role: "user",
          content: `Create an interactive lesson for learning ${language} on the topic "${lessonTitle}". All exercises should be "listen and repeat" type. Provide a JSON object with the following structure:
          {
            "introduction": "Brief introduction to the lesson",
            "exercises": [
              {
                "type": "listen_and_repeat",
                "prompt": "Listen and repeat the following phrase",
                "phrase": "Phrase in ${language}",
                "translation": "English translation of the phrase"
              }
            ]
          }
          Provide 5 exercises, all of "listen_and_repeat" type. Each exercise should introduce a new phrase related to the lesson topic. Ensure the phrases progress in complexity throughout the lesson. Respond with the JSON object only, no additional text or formatting.`
        }
      ],
    });

    const content = response.choices[0].message.content;
    const lessonContent = JSON.parse(content);

    // Generate audio for each exercise
    for (let exercise of lessonContent.exercises) {
      exercise.audio = await generateAudio(exercise.phrase, language);
    }

    // Save lesson to the database
    const savedLesson = await db.collection('lessons').insertOne({
      userId,
      curriculumId,
      lessonId,
      language,
      title: lessonTitle,
      content: lessonContent,
      createdAt: new Date(),
    });

    // Update user progress
    await db.collection('userProgress').updateOne(
      { userId, [`${language}.curriculumId`]: curriculumId },
      { 
        $set: { 
          [`${language}.lessons.${lessonId}`]: {
            completed: false,
            lastAccessed: new Date()
          }
        }
      },
      { upsert: true }
    );

    return NextResponse.json({
      _id: savedLesson.insertedId,
      userId,
      curriculumId,
      lessonId,
      language,
      title: lessonTitle,
      content: lessonContent,
    });
  } catch (error) {
    console.error('Error generating lesson content:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate lesson content', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }, 
      { status: 500 }
    );
  }
}

async function generateAudio(text, language) {
  // This is a placeholder function. Replace with actual audio generation logic.
  // You might use a text-to-speech service here, like Google Cloud Text-to-Speech or Amazon Polly.
  console.log(`Generating audio for: "${text}" in ${language}`);
  return `https://example.com/audio/${encodeURIComponent(text)}.mp3`;
}
