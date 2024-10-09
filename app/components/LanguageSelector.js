'use client';

import React from 'react';

const languages = ['Spanish', 'French', 'German', 'Italian', 'Chinese'];

function LanguageSelector({ onSelectLanguage }) {
  return (
    <div className="LanguageSelector flex flex-col items-center justify-center min-h-screen bg-gray-100 p-8">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Select a language to learn:</h2>
      <ul className="grid grid-cols-2 gap-6 w-full max-w-md">
        {languages.map((language) => (
          <li key={language} className="relative">
            <button
              onClick={() => onSelectLanguage(language)}
              className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105"
              aria-label={`Select ${language}`}
            >
              {language}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default LanguageSelector;