'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import Lesson from '../../components/Lesson';

export default function LessonPage({ params }) {
  const searchParams = useSearchParams();
  const language = searchParams.get('language');
  const languageCode = searchParams.get('languageCode');
  const lessonTitle = searchParams.get('title');

  // We'll assume the lesson object is passed as URL parameters for simplicity
  // In a real-world scenario, you might want to fetch the lesson data here or in the Lesson component
  const lesson = {
    id: params.lessonId,
    title: lessonTitle,
  };

  console.log("lesson page", language);

  return (
    <div className="LessonPage">
      <Lesson
        lesson={lesson}
        language={language}
        languageCode={languageCode}
        onComplete={() => {
          // Handle lesson completion, e.g., navigate back to curriculum
          window.history.back();
        }}
      />
    </div>
  );
}