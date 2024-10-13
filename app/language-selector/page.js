'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

const languages = [
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
];

export default function LanguageSelector() {
  const router = useRouter();
  const { user, getToken } = useAuth();

  React.useEffect(() => {
    const checkAuth = async () => {
      const token = await getToken();
      if (!token) {
        router.push('/auth');
      }
    };
    checkAuth();
  }, [router, getToken]);

  if (!user) {
    return null; // or a loading spinner
  }

  const handleLanguageSelect = (language) => {
    router.push(`/curriculum/${language.code}?name=${encodeURIComponent(language.name)}`);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center text-blue-600">Choose a Language</h1>
      <div className="grid grid-cols-2 gap-4">
        {languages.map((language) => (
          <button
            key={language.code}
            onClick={() => handleLanguageSelect(language)}
            className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow text-left"
          >
            <h2 className="text-xl font-semibold mb-2">{language.name}</h2>
            <p className="text-gray-600">Start learning {language.name} now!</p>
          </button>
        ))}
      </div>
    </div>
  );
}
