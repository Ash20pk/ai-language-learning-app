import React from 'react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto text-center">
      <h1 className="text-4xl font-bold mb-6 text-blue-600">Welcome to Language Learning</h1>
      <p className="text-xl text-gray-700 mb-8">
        Embark on your language learning journey today! Explore new cultures and connect with people around the world.
      </p>
      <div className="space-y-4">
        <Link href="/auth" className="inline-block bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors">
          Get Started
        </Link>
      </div>
    </div>
  );
}
