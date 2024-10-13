import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../lib/mongodb';
import { verifyToken } from '../../lib/auth'; 

export async function GET(req) {
  // Get the token from the Authorization header
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = authHeader.split(' ')[1];

  try {
    // Verify the token and get the user ID
    const userId = await verifyToken(token);
    if (!userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const languageCode = searchParams.get('languageCode');

    const { db } = await connectToDatabase();
    const userProgress = db.collection('userProgress');

    const progress = await userProgress.find({ userId, languageCode }).toArray();

    const progressMap = progress.reduce((acc, item) => {
      acc[item.lessonId] = {
        exerciseIndex: item.exerciseIndex,
        completed: item.completed,
      };
      return acc;
    }, {});

    return NextResponse.json(progressMap);
  } catch (error) {
    console.error('Error fetching user progress:', error);
    return NextResponse.json({ error: 'Failed to fetch user progress' }, { status: 500 });
  }
}
