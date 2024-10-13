import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../lib/mongodb';
import { verifyToken } from '../../lib/auth'; 
export async function POST(req) {
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

    const { languageCode, lessonId, exerciseIndex, completed } = await req.json();

    const { db } = await connectToDatabase();
    const userProgress = db.collection('userProgress');

    const result = await userProgress.updateOne(
      { userId, languageCode, lessonId },
      { 
        $set: { 
          exerciseIndex,
          completed: completed ? true : '$completed' // Only update to true if completed is true
        }
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Error saving progress:', error);
    return NextResponse.json({ error: 'Failed to save progress' }, { status: 500 });
  }
}
