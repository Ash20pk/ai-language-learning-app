import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/mongodb';
import { generateToken } from '../../../lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(req) {
  try {
    const { email, password } = await req.json();
    const { db } = await connectToDatabase();
    const user = await db.collection('users').findOne({ email });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    const token = await generateToken(user._id.toString());

    console.log('Login successful. Sending response:', { token, user: { id: user._id.toString(), email: user.email, name: user.name } });

    return NextResponse.json({ 
      token, 
      user: { id: user._id.toString(), email: user.email } 
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
