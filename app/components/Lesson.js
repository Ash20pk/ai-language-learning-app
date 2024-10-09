'use client';

import React, { useState, useEffect, useRef } from 'react';

function Lesson({ lesson, language, onComplete }) {
  const [content, setContent] = useState(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const recognition = useRef(null);
  const speechSynthesisRef = useRef(window.speechSynthesis);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      recognition.current = new window.webkitSpeechRecognition();
      recognition.current.continuous = false;
      recognition.current.lang = language;
      recognition.current.onresult = handleSpeechResult;
    }
  }, [language]);

  useEffect(() => {
    async function fetchLessonContent() {
      try {
        setIsLoading(true);
        const response = await fetch('/api/generate-lesson', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ language, lessonTitle: lesson.title }),
        });
        if (!response.ok) {
          throw new Error('Failed to fetch lesson content');
        }
        const data = await response.json();
        setContent(data);
      } catch (err) {
        setError(`Failed to generate lesson content: ${err.message}`);
        console.error('Full error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLessonContent();
  }, [lesson, language]);

  const getVoiceForLanguage = (lang) => {
    const voices = speechSynthesisRef.current.getVoices();
    const languageVoices = {
      'en-US': 'Google US English',
      'en-GB': 'Google UK English Male',
      'fr-FR': 'Google français',
      'de-DE': 'Google Deutsch',
      'it-IT': 'Google italiano',
      'es-ES': 'Google español',
      'ja-JP': 'Google 日本語',
      'ko-KR': 'Google 한국의',
      'zh-CN': 'Google 普通话（中国大陆）',
    };

    const preferredVoice = voices.find(voice => voice.name === languageVoices[lang]);
    return preferredVoice || voices.find(voice => voice.lang.startsWith(lang)) || voices[0];
  };

  const speakPhrase = (phrase) => {
    const utterance = new SpeechSynthesisUtterance(phrase);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.voice = getVoiceForLanguage(language);
    speechSynthesisRef.current.speak(utterance);
  };

  const startListening = () => {
    setIsListening(true);
    recognition.current.start();
  };

  const handleSpeechResult = (event) => {
    const last = event.results.length - 1;
    const userSaid = event.results[last][0].transcript;
    checkAnswer(userSaid);
    setIsListening(false);
  };

  const checkAnswer = (userSaid) => {
    const currentExercise = content.exercises[currentExerciseIndex];
    const correctAnswer = currentExercise.type === 'speak_and_check' 
      ? currentExercise.correctResponse 
      : currentExercise.phrase;
    
    if (userSaid.toLowerCase().trim() === correctAnswer.toLowerCase().trim()) {
      setFeedback('Correct!');
    } else {
      setFeedback(`Not quite. The correct phrase is: "${correctAnswer}"`);
    }
  };

  const nextExercise = () => {
    if (currentExerciseIndex < content.exercises.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
      setFeedback(null);
    } else {
      onComplete();
    }
  };

  if (isLoading) {
    return <p>Generating lesson content...</p>;
  }

  if (error) {
    return (
      <div className="text-red-500">
        <p>{error}</p>
        <p>Please try refreshing the page or selecting a different lesson.</p>
      </div>
    );
  }

  if (!content || !content.introduction || !Array.isArray(content.exercises)) {
    return <p>Invalid lesson content received. Please try again.</p>;
  }

  const currentExercise = content.exercises[currentExerciseIndex];

  return (
    <div className="Lesson">
      <h2 className="text-2xl mb-4">{lesson.title}</h2>
      {currentExerciseIndex === 0 && <p className="mb-4">{content.introduction}</p>}
      <div className="exercise bg-gray-100 p-4 rounded mb-4">
        <p className="font-bold mb-2">{currentExercise.prompt}</p>
        {currentExercise.type === 'listen_and_repeat' && (
          <div>
            <p className="mb-2">{currentExercise.phrase}</p>
            <p className="text-gray-600 mb-2">Translation: {currentExercise.translation}</p>
            <button
              onClick={() => speakPhrase(currentExercise.phrase)}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-2"
            >
              Listen
            </button>
            <button
              onClick={startListening}
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
              disabled={isListening}
            >
              {isListening ? 'Listening...' : 'Speak'}
            </button>
          </div>
        )}
        {currentExercise.type === 'speak_and_check' && (
          <div>
            <p className="mb-2">{currentExercise.phrase}</p>
            <button
              onClick={startListening}
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
              disabled={isListening}
            >
              {isListening ? 'Listening...' : 'Speak'}
            </button>
          </div>
        )}
      </div>
      {feedback && (
        <div>
          <p className={feedback.startsWith('Correct') ? 'text-green-500' : 'text-red-500'}>
            {feedback}
          </p>
          <button
            onClick={nextExercise}
            className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default Lesson;