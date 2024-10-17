'use client';

import React from 'react';
import Auth from '../components/Auth';

/**
 * @dev AuthPage component that renders the authentication form.
 * @returns {JSX.Element} - The rendered AuthPage component.
 */
export default function AuthPage() {
  return (
    <div className="max-w-md mx-auto mt-8">
      <Auth />
    </div>
  );
}