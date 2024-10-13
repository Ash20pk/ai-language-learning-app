import { ObjectId } from 'mongodb';
import { connectToDatabase } from '../lib/mongodb';

export async function findUserByEmail(email) {
  const { db } = await connectToDatabase();
  const collection = db.collection('users');
  return collection.findOne({ email });
}

export async function createUser(userData) {
  const { db } = await connectToDatabase();
  const collection = db.collection('users');
  const result = await collection.insertOne(userData);
  return { ...userData, _id: result.insertedId };
}

export async function findUserById(id) {
  const { db } = await connectToDatabase();
  const collection = db.collection('users');
  return collection.findOne({ _id: new ObjectId(id) });
}
