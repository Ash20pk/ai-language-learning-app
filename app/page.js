'use client';

import { useState } from 'react';
import LanguageSelector from './components/LanguageSelector';
import Curriculum from './components/Curriculum';

export default function Home() {
  const [selectedLanguage, setSelectedLanguage] = useState(null);

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1 className="text-4xl font-bold mb-8">AI Language Learning Platform</h1>
      {!selectedLanguage ? (
        <LanguageSelector onSelectLanguage={setSelectedLanguage} />
      ) : (
        <Curriculum language={selectedLanguage} />
      )}
    </main>
  );
}
