import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../lib/mongodb';
import { verifyToken } from '../../lib/auth';
import fs from 'fs';
import path from 'path';

// Load the language-codes JSON file once when the module is loaded
let languageCodes = [];

try {
  const filePath = path.join(process.cwd(), 'language_codes.json');
  const data = fs.readFileSync(filePath, 'utf8');
  languageCodes = JSON.parse(data);
} catch (err) {
  console.error("Error reading language codes file:", err);
}

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
  const language = languageCodes.find(lang => lang.alpha2.toLowerCase() === languageCode.toLowerCase());
  return language ? language.English : languageCode;
}

export async function POST(req) {
  try {
    const token = req.headers.get('Authorization')?.split(' ')[1];
    const userId = await verifyToken(token);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { languageName } = await req.json();
    const language = languageCodes.find(lang => lang.English.toLowerCase() === languageName.toLowerCase());
    
    if (!language) {
      return NextResponse.json({ error: 'Invalid language' }, { status: 400 });
    }

    const languageCode = language.alpha2.toLowerCase();

    const { db } = await connectToDatabase();
    
    await db.collection('userProgress').updateOne(
      { userId },
      { $set: { [`${languageCode}`]: { name: language.English } } },
      { upsert: true }
    );

    return NextResponse.json({ success: true, languageCode, languageName: language.English });
  } catch (error) {
    console.error('Error adding user language:', error);
    return NextResponse.json({ error: 'Failed to add user language' }, { status: 500 });
  }
}
