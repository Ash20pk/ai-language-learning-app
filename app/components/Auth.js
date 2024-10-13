'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import SignUp from './SignUp';
import Login from './Login';

export default function Auth() {
  const [showSignUp, setShowSignUp] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  if (user) {
    router.push('/language-selector');
    return null;
  }

  return (
    <div className="max-w-md mx-auto mt-8">
      {showSignUp ? (
        <>
          <SignUp />
          <p className="mt-4 text-center">
            Already have an account?{' '}
            <button
              onClick={() => setShowSignUp(false)}
              className="text-blue-500 hover:underline"
            >
              Log in
            </button>
          </p>
        </>
      ) : (
        <>
          <Login />
          <p className="mt-4 text-center">
            Don't have an account?{' '}
            <button
              onClick={() => setShowSignUp(true)}
              className="text-blue-500 hover:underline"
            >
              Sign up
            </button>
          </p>
        </>
      )}
    </div>
  );
}
