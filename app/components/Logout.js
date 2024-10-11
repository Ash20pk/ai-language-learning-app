'use client';

import React from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Logout() {
  const { logout } = useAuth();

  return (
    <button
      onClick={logout}
      className="bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600"
    >
      Logout
    </button>
  );
}