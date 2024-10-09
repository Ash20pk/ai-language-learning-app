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
    return <p>Generating curriculum...</p>;
  }

  if (error) {
    return (
      <div className="text-red-500">
        <p>{error}</p>
        <p>Please try refreshing the page or selecting a different language.</p>
      </div>
    );
  }

  if (!curriculum || curriculum.length === 0) {
    return <p>No curriculum data available. Please try again.</p>;
  }

  return (
    <div className="Curriculum">
      <h2 className="text-2xl mb-4">{language} Curriculum</h2>
      <ul className="space-y-4">
        {curriculum.map((lesson) => (
          <li key={lesson.id} className="bg-white shadow-md rounded-lg p-4">
            <h3 className="text-xl font-semibold mb-2">{lesson.title}</h3>
            <p className="text-gray-600 mb-4">{lesson.description}</p>
            <button
              onClick={() => startLesson(lesson)}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
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