'use client';

import React from 'react';

const languages = ['Spanish', 'French', 'German', 'Italian', 'Chinese'];

function LanguageSelector({ onSelectLanguage }) {
  return (
    <div className="LanguageSelector">
      <h2 className="text-2xl mb-4">Select a language to learn:</h2>
      <ul className="grid grid-cols-2 gap-4">
        {languages.map((language) => (
          <li key={language}>
            <button
              onClick={() => onSelectLanguage(language)}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
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