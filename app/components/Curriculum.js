'use client';

import React, { useState, useEffect } from 'react';
import Lesson from './Lesson';

function Curriculum({ language }) {
  const [curriculum, setCurriculum] = useState(null);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchCurriculum() {
      try {
        setLoading(true);
        const response = await fetch('/api/generate-curriculum', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ language }),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.details || 'Failed to fetch curriculum');
        }
        const generatedCurriculum = await response.json();
        if (!Array.isArray(generatedCurriculum)) {
          throw new Error('Invalid curriculum format');
        }
        setCurriculum(generatedCurriculum);
      } catch (err) {
        setError(`Failed to generate curriculum: ${err.message}`);
        console.error('Curriculum error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchCurriculum();
  }, [language]);

  const startLesson = (lesson) => {
    setCurrentLesson(lesson);
  };

  if (currentLesson) {
    return <Lesson lesson={currentLesson} language={language} onComplete={() => setCurrentLesson(null)} />;
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md shadow-md">
        <p className="font-bold">Error</p>
        <p>{error}</p>
        <p className="mt-2">Please try refreshing the page or selecting a different language.</p>
      </div>
    );
  }

  if (!curriculum || curriculum.length === 0) {
    return (
      <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-md shadow-md">
        <p className="font-bold">No Curriculum Data</p>
        <p>No curriculum data available. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="Curriculum p-8 bg-gray-100 min-h-screen">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">{language} Curriculum</h2>
      <ul className="space-y-6">
        {curriculum.map((lesson) => (
          <li key={lesson.id} className="bg-white shadow-lg rounded-lg p-6 transition-all duration-300 ease-in-out transform hover:scale-105">
            <h3 className="text-2xl font-semibold mb-2 text-gray-800">{lesson.title}</h3>
            <p className="text-gray-600 mb-4">{lesson.description}</p>
            <button
              onClick={() => startLesson(lesson)}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all duration-300 ease-in-out transform hover:scale-105"
              aria-label={`Start lesson: ${lesson.title}`}
            >
              Start Lesson
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Curriculum;