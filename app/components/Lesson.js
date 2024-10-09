'use client';

import React, { useState, useEffect, useRef } from 'react';

function Lesson({ lesson, language, onComplete, nextLessonId, onNavigateToNextLesson }) {
  const [content, setContent] = useState(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [audioCache, setAudioCache] = useState({});
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isVADListening, setIsVADListening] = useState(false);
  const recognition = useRef(null);
  const audioRef = useRef(new Audio());
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const microphoneStreamRef = useRef(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      recognition.current = new window.webkitSpeechRecognition();
      recognition.current.continuous = true;
      recognition.current.interimResults = true;
      recognition.current.lang = language;
      recognition.current.onresult = handleSpeechResult;
      recognition.current.onend = handleSpeechEnd;
    }

    return () => {
      stopListening();
    };
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
        await preGenerateAudio(data.exercises);
      } catch (err) {
        setError(`Failed to generate lesson content: ${err.message}`);
        console.error('Full error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLessonContent();
  }, [lesson, language]);

  const preGenerateAudio = async (exercises) => {
    setIsGeneratingAudio(true);
    const newAudioCache = { ...audioCache };
    for (const exercise of exercises) {
      if (exercise.type === 'listen_and_repeat' && !newAudioCache[exercise.phrase]) {
        try {
          const audioBlob = await generateAudio(exercise.phrase);
          newAudioCache[exercise.phrase] = URL.createObjectURL(audioBlob);
        } catch (error) {
          console.error('Error pre-generating audio:', error);
        }
      }
    }
    setAudioCache(newAudioCache);
    setIsGeneratingAudio(false);
  };

  const generateAudio = async (text) => {
    const response = await fetch('/api/generate-audio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate audio');
    }

    return await response.blob();
  };

  const speakPhrase = async (phrase) => {
    if (audioCache[phrase]) {
      audioRef.current.src = audioCache[phrase];
      await audioRef.current.play();
    } else {
      try {
        const audioBlob = await generateAudio(phrase);
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioCache({ ...audioCache, [phrase]: audioUrl });
        audioRef.current.src = audioUrl;
        await audioRef.current.play();
      } catch (err) {
        console.error('Error playing audio:', err);
      }
    }
  };

  const startListening = async () => {
    setIsListening(true);
    setFeedback(null);
    setIsVADListening(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      microphoneStreamRef.current = stream;

      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const microphone = audioContextRef.current.createMediaStreamSource(stream);
      microphone.connect(analyserRef.current);

      const detectVoiceActivity = () => {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        
        if (average > 20) { // Adjust this threshold as needed
          if (!isListening) {
            recognition.current.start();
          }
        } else {
          if (isListening) {
            recognition.current.stop();
          }
        }

        if (isVADListening) {
          requestAnimationFrame(detectVoiceActivity);
        }
      };

      detectVoiceActivity();
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setIsListening(false);
      setIsVADListening(false);
    }
  };

  const stopListening = () => {
    setIsListening(false);
    setIsVADListening(false);
    if (recognition.current) {
      recognition.current.stop();
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    if (microphoneStreamRef.current) {
      microphoneStreamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const handleSpeechResult = (event) => {
    const last = event.results.length - 1;
    const userSaid = event.results[last][0].transcript;
    if (event.results[last].isFinal) {
      checkAnswer(userSaid);
      stopListening();
    }
  };

  const handleSpeechEnd = () => {
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

  // UI Components
  const LoadingSpinner = () => (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );

  const ErrorMessage = ({ message }) => (
    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md shadow-md">
      <p className="font-bold">Error</p>
      <p>{message}</p>
      <p className="mt-2">Please try refreshing the page or selecting a different lesson.</p>
    </div>
  );

  const ProgressBar = () => {
    const progress = (currentExerciseIndex / content.exercises.length) * 100;
    return (
      <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-in-out"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    );
  };

  const ExercisePrompt = ({ prompt }) => (
    <h3 className="text-xl font-semibold mb-4 text-gray-800">{prompt}</h3>
  );

  const Button = ({ onClick, className, children }) => (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-md font-semibold text-white transition-colors duration-200 ${className}`}
    >
      {children}
    </button>
  );

  if (isLoading || isGeneratingAudio) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  if (!content || !content.introduction || !Array.isArray(content.exercises)) {
    return <ErrorMessage message="Invalid lesson content received. Please try again." />;
  }

  const handleNextLesson = () => {
    if (nextLessonId && onNavigateToNextLesson) {
      onNavigateToNextLesson(nextLessonId);
    }
  };

  const currentExercise = content.exercises[currentExerciseIndex];

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold mb-6 text-center text-blue-600">{lesson.title}</h2>
      <ProgressBar />
      {currentExerciseIndex === 0 && <p className="mb-6 text-gray-700">{content.introduction}</p>}
      <div className="bg-gray-100 p-6 rounded-lg mb-6">
        <ExercisePrompt prompt={currentExercise.prompt} />
        {currentExercise.type === 'listen_and_repeat' && (
          <div className="space-y-4">
            <p className="text-lg font-medium text-gray-800">{currentExercise.phrase}</p>
            <p className="text-gray-600 italic">{currentExercise.translation}</p>
            <div className="flex space-x-4">
              <Button
                onClick={() => speakPhrase(currentExercise.phrase)}
                className="bg-blue-500 hover:bg-blue-600"
              >
                Listen
              </Button>
              <Button
                onClick={isVADListening ? stopListening : startListening}
                className={isVADListening ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}
              >
                {isVADListening ? 'Stop Listening' : 'Start Listening'}
              </Button>
            </div>
            {isVADListening && <p className="text-sm text-gray-600 mt-2">Listening for voice activity...</p>}
          </div>
        )}
        {currentExercise.type === 'speak_and_check' && (
          <div className="space-y-4">
            <p className="text-lg font-medium text-gray-800">{currentExercise.phrase}</p>
            <Button
              onClick={isVADListening ? stopListening : startListening}
              className={isVADListening ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}
            >
              {isVADListening ? 'Stop Listening' : 'Start Listening'}
            </Button>
            {isVADListening && <p className="text-sm text-gray-600 mt-2">Listening for voice activity...</p>}
          </div>
        )}
      </div>
      {feedback && (
        <div className={`p-4 rounded-lg mb-6 ${feedback.startsWith('Correct') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          <p className="font-medium">{feedback}</p>
        </div>
      )}
      {feedback && (
        <div className="flex justify-center space-x-4">
          {currentExerciseIndex < content.exercises.length - 1 ? (
            <Button onClick={nextExercise} className="bg-blue-500 hover:bg-blue-600">
              Next Exercise
            </Button>
          ) : (
            <>
              <Button onClick={onComplete} className="bg-green-500 hover:bg-green-600">
                Complete Lesson
              </Button>
              {nextLessonId && onNavigateToNextLesson && (
                <Button onClick={handleNextLesson} className="bg-blue-500 hover:bg-blue-600">
                  Next Lesson
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default Lesson;