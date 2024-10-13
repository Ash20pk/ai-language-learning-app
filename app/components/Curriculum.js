'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';

function Curriculum({ languageCode, language }) {
  const router = useRouter();
  const { user, getToken } = useAuth();
  const [curriculum, setCurriculum] = useState(null);
  const [userProgress, setUserProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchCurriculumAndProgress() {
      try {
        setLoading(true);
        const token = await getToken();

        const [curriculumResponse, progressResponse] = await Promise.all([
          fetch('/api/generate-curriculum', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ language, languageCode }),
          }),
          fetch(`/api/user-progress?userId=${user.id}&languageCode=${languageCode}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }),
        ]);

        if (!curriculumResponse.ok || !progressResponse.ok) {
          throw new Error('Failed to fetch data');
        }

        const [generatedCurriculum, progress] = await Promise.all([
          curriculumResponse.json(),
          progressResponse.json(),
        ]);

        setCurriculum(generatedCurriculum);
        setUserProgress(progress);
      } catch (err) {
        setError(`Failed to fetch data: ${err.message}`);
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      fetchCurriculumAndProgress();
    }
  }, [language, languageCode, user, getToken]);

  const startLesson = (lesson) => {
    router.push(`/lesson/${lesson.id}?language=${encodeURIComponent(language)}&languageCode=${languageCode}&title=${encodeURIComponent(lesson.title)}`);
  };

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <h2 className="text-3xl font-bold mb-6 text-center text-blue-600">Please log in to view the curriculum</h2>
      </div>
    );
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
        {curriculum.map((lesson, index) => {
          const progress = userProgress[lesson.id] || { completed: false, exerciseIndex: 0 };
          const isUnlocked = index === 0 || userProgress[curriculum[index - 1].id]?.completed;
          
          return (
            <li key={lesson.id} className="bg-white shadow-lg rounded-lg p-6 transition-all duration-300 ease-in-out transform hover:scale-105">
              <h3 className="text-2xl font-semibold mb-2 text-gray-800">{lesson.title}</h3>
              <p className="text-gray-600 mb-4">{lesson.description}</p>
              <div className="flex justify-between items-center">
                <button
                  onClick={() => startLesson(lesson)}
                  className={`font-bold py-3 px-6 rounded-lg shadow-md transition-all duration-300 ease-in-out transform hover:scale-105 ${
                    isUnlocked
                      ? 'bg-blue-500 hover:bg-blue-700 text-white'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                  disabled={!isUnlocked}
                  aria-label={`Start lesson: ${lesson.title}`}
                >
                  {progress.completed ? 'Review Lesson' : isUnlocked ? 'Start Lesson' : 'Locked'}
                </button>
                {progress.completed && (
                  <span className="text-green-500 font-semibold">Completed</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default Curriculum;
