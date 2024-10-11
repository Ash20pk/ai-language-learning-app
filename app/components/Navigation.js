'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import Logout from './Logout';

export default function Navigation() {
  const { user } = useAuth();

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link href="/" className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold text-blue-600">LangLearn</span>
            </Link>
          </div>
          <div className="flex items-center">
            {user ? (
              <>
                <span className="text-gray-700 mr-4">Welcome, {user.name}!</span>
                <Link href="/language-selector" className="text-gray-700 hover:text-blue-600 mr-4">
                  Languages
                </Link>
                <Logout />
              </>
            ) : (
              <Link href="/auth" className="text-gray-700 hover:text-blue-600">
                Log in / Sign up
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}