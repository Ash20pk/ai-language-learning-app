import { ObjectId } from 'mongodb';
import clientPromise from '../lib/mongodb';

export async function findUserByEmail(email) {
  const client = await clientPromise;
  const collection = client.db().collection('users');
  return collection.findOne({ email });
}

export async function createUser(userData) {
  const client = await clientPromise;
  const collection = client.db().collection('users');
  const result = await collection.insertOne(userData);
  return { ...userData, _id: result.insertedId };
}

export async function findUserById(id) {
  const client = await clientPromise;
  const collection = client.db().collection('users');
  return collection.findOne({ _id: new ObjectId(id) });
}