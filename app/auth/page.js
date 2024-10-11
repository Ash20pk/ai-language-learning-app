'use client';

import React from 'react';
import Auth from '../components/Auth';

export default function AuthPage() {
  return (
    <div className="max-w-md mx-auto mt-8">
      <h1 className="text-3xl font-bold mb-6 text-center text-blue-600">Authentication</h1>
      <Auth />
    </div>
  );
}