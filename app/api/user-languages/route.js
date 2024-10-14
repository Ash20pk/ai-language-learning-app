import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../lib/mongodb';
import { verifyToken } from '../../lib/auth';

export async function GET(req) {
  try {
    const token = req.headers.get('Authorization')?.split(' ')[1];
    const userId = await verifyToken(token);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const userProgress = await db.collection('userProgress').findOne({ userId });

    if (!userProgress) {
      return NextResponse.json({ languages: [] });
    }

    const languages = Object.keys(userProgress)
      .filter(key => key !== 'userId' && key !== '_id')
      .map(languageCode => ({
        code: languageCode.toLowerCase(),
        name: getLanguageName(languageCode),
      }))
      .filter((language, index, self) => 
        index === self.findIndex((t) => t.code === language.code)
      );

    return NextResponse.json({ languages });
  } catch (error) {
    console.error('Error fetching user languages:', error);
    return NextResponse.json({ error: 'Failed to fetch user languages' }, { status: 500 });
  }
}

function getLanguageName(languageCode) {
  const languageNames = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese',
    'hi': 'Hindi',
    // Add more language codes and names as needed
  };
  return languageNames[languageCode.toLowerCase()] || languageCode;
}

export async function POST(req) {
  try {
    const token = req.headers.get('Authorization')?.split(' ')[1];
    const userId = await verifyToken(token);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { languageCode, languageName } = await req.json();
    const normalizedLanguageCode = languageCode.toLowerCase();

    const { db } = await connectToDatabase();
    
    await db.collection('userProgress').updateOne(
      { userId },
      { $set: { [`${normalizedLanguageCode}`]: { name: languageName } } },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adding user language:', error);
    return NextResponse.json({ error: 'Failed to add user language' }, { status: 500 });
  }
}
