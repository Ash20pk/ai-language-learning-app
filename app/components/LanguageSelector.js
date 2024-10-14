'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

const predefinedLanguages = [
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
];

function LanguageSelector() {
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm) {
      const languageCode = searchTerm.toLowerCase().slice(0, 2);
      router.push(`/curriculum/${languageCode}?name=${encodeURIComponent(searchTerm)}`);
    }
  };

  const handleLanguageSelect = (language) => {
    router.push(`/curriculum/${language.code}?name=${encodeURIComponent(language.name)}`);
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6 text-center text-blue-600">Search a language you want to learn</h1>
      
      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex items-center border-b border-blue-500 py-2">
          <input
            className="appearance-none bg-transparent border-none w-full text-gray-700 mr-3 py-1 px-2 leading-tight focus:outline-none"
            type="text"
            placeholder="Search for a language"
            aria-label="Language"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button
            className="flex-shrink-0 bg-blue-500 hover:bg-blue-700 border-blue-500 hover:border-blue-700 text-sm border-4 text-white py-1 px-2 rounded"
            type="submit"
          >
            Search
          </button>
        </div>
      </form>

      <div className="grid grid-cols-2 gap-4">
        {predefinedLanguages.map((language) => (
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

export default LanguageSelector;
