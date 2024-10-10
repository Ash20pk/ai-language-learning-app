'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

function Lesson({ lesson, language, onComplete, nextLessonId, onNavigateToNextLesson }) {
  const [content, setContent] = useState(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [audioCache, setAudioCache] = useState({});
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isPlayingGuidedAudio, setIsPlayingGuidedAudio] = useState(false);
  const recognition = useRef(null);
  const isRecognitionInitialized = useRef(false);
  const audioRef = useRef(new Audio());
  const guidedAudioRef = useRef(new Audio());
  const [transcription, setTranscription] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const audioChunks = useRef([]);
  const mediaRecorder = useRef(null);

  useEffect(() => {
    async function fetchLessonContent() {
      console.log('Fetching lesson content for:', lesson.title);
      try {
        setIsLoading(true);
        const response = await fetch('/api/generate-lesson', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ language, lessonTitle: lesson.title }),
        });
        console.log('API response status:', response.status);
        if (!response.ok) {
          throw new Error(`Failed to fetch lesson content: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        console.log('Received lesson content:', data);
        if (!data || !data.exercises || !Array.isArray(data.exercises)) {
          throw new Error('Invalid lesson content structure received');
        }
        setContent(data);
        console.log('Content set in state:', data);
        await preGenerateAudio(data.exercises);
        await playGuidedAudio(`Welcome to the lesson: ${lesson.title}. Let's begin with the first exercise.`);
      } catch (err) {
        console.error('Error fetching lesson content:', err);
        setError(`Failed to generate lesson content: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLessonContent();
  }, [lesson, language]);

  const preGenerateAudio = async (exercises) => {
    console.log('Pre-generating audio');
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
    console.log('Audio pre-generation complete');
  };

  const generateAudio = async (text) => {
    console.log('Generating audio for:', text);
    const response = await fetch('/api/generate-audio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, language }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate audio');
    }

    return await response.blob();
  };

  const playGuidedAudio = useCallback(async (text) => {
    console.log('Playing guided audio:', text);
    if (isPlayingGuidedAudio) {
      console.log('Guided audio is already playing. Skipping:', text);
      return;
    }
    
    setIsPlayingGuidedAudio(true);
    try {
      const audioBlob = await generateAudio(text);
      const audioUrl = URL.createObjectURL(audioBlob);
      guidedAudioRef.current.src = audioUrl;
      guidedAudioRef.current.onended = () => {
        URL.revokeObjectURL(audioUrl);
        setIsPlayingGuidedAudio(false);
        console.log('Guided audio playback ended');
      };
      await guidedAudioRef.current.play();
    } catch (error) {
      console.error('Error playing guided audio:', error);
      setIsPlayingGuidedAudio(false);
    }
  }, [isPlayingGuidedAudio]);

  const speakPhrase = async (phrase) => {
    console.log('Speaking phrase:', phrase);
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
    await playGuidedAudio("Now, please repeat the phrase.");
  };

  const checkAnswer = useCallback((userSaid) => {
    console.log('Checking answer. Content:', content);
    console.log('Current exercise index:', currentExerciseIndex);

    if (!content) {
      console.error('Content is null or undefined');
      setFeedback('Sorry, there was an error checking your answer. Please try again.');
      return;
    }

    if (!Array.isArray(content.exercises)) {
      console.error('content.exercises is not an array:', content.exercises);
      setFeedback('Sorry, there was an error with the lesson structure. Please try again.');
      return;
    }

    if (currentExerciseIndex < 0 || currentExerciseIndex >= content.exercises.length) {
      console.error('Current exercise index is out of bounds:', currentExerciseIndex);
      setFeedback('Sorry, there was an error with the current exercise. Please try again.');
      return;
    }

    const currentExercise = content.exercises[currentExerciseIndex];
    console.log('Current exercise:', currentExercise);

    if (!currentExercise) {
      console.error('Current exercise is null or undefined');
      setFeedback('Sorry, there was an error with the current exercise. Please try again.');
      return;
    }

    const correctAnswer = currentExercise.type === 'speak_and_check' 
      ? currentExercise.correctResponse 
      : currentExercise.phrase;

    console.log('User said:', userSaid);
    console.log('Correct answer:', correctAnswer);

    if (userSaid.toLowerCase().trim() === correctAnswer.toLowerCase().trim()) {
      console.log('Answer is correct');
      setFeedback('Correct!');
      playGuidedAudio("Excellent! That's correct.");
    } else {
      console.log('Answer is incorrect');
      setFeedback(`Not quite. The correct phrase is: "${correctAnswer}"`);
      playGuidedAudio(`Not quite. The correct phrase is: "${correctAnswer}". Let's try again.`);
    }
  }, [content, currentExerciseIndex, playGuidedAudio]);

  const initializeSpeechRecognition = useCallback(() => {
    if ('webkitSpeechRecognition' in window && !isRecognitionInitialized.current && content) {
      recognition.current = new window.webkitSpeechRecognition();
      recognition.current.continuous = false;
      recognition.current.interimResults = false;
      recognition.current.lang = language;

      recognition.current.onresult = (event) => {
        const userSaid = event.results[0][0].transcript;
        console.log('Speech recognized:', userSaid);
        checkAnswer(userSaid);
      };

      recognition.current.onend = () => {
        console.log('Speech recognition ended');
        setIsListening(false);
      };

      recognition.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      isRecognitionInitialized.current = true;
      console.log('Speech recognition initialized');
    }
  }, [language, checkAnswer, content]);

  useEffect(() => {
    if (content) {
      initializeSpeechRecognition();
    }
  }, [content, initializeSpeechRecognition]);

  const startRecording = useCallback(() => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        mediaRecorder.current = new MediaRecorder(stream);
        audioChunks.current = [];

        mediaRecorder.current.ondataavailable = (event) => {
          audioChunks.current.push(event.data);
        };

        mediaRecorder.current.onstop = async () => {
          const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
          await transcribeAudio(audioBlob);
        };

        mediaRecorder.current.start();
        setIsListening(true);
      })
      .catch(error => {
        console.error('Error accessing microphone:', error);
        setFeedback('Error accessing microphone. Please check your permissions.');
      });
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop();
      setIsListening(false);
    }
  }, []);

  const transcribeAudio = async (audioBlob) => {
    setIsTranscribing(true);
    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio.wav'); // Add a filename
    formData.append('language', language); // Make sure 'language' is the full name, e.g., 'Spanish'

    try {
      const response = await fetch('/api/transcribe-audio', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to transcribe audio');
      }

      const data = await response.json();
      setTranscription(data.text);
      checkAnswer(data.text);
    } catch (error) {
      console.error('Error transcribing audio:', error);
      setFeedback('Error transcribing audio. Please try again.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const startListening = useCallback(() => {
    console.log('Starting listening, content:', content);
    if (!content || !content.exercises || content.exercises.length <= currentExerciseIndex) {
      console.error('Lesson content not available', { content, currentExerciseIndex });
      setFeedback('Sorry, the lesson is not ready yet. Please wait a moment and try again.');
      return;
    }

    setFeedback(null);
    startRecording();
  }, [content, currentExerciseIndex, startRecording]);

  const stopListening = useCallback(() => {
    console.log('Stopping listening');
    stopRecording();
  }, [stopRecording]);

  const nextExercise = () => {
    console.log('Moving to next exercise');
    if (currentExerciseIndex < content.exercises.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
      setFeedback(null);
      playGuidedAudio("Great! Let's move on to the next exercise.");
    } else {
      console.log('Lesson completed');
      onComplete();
      playGuidedAudio("Congratulations! You've completed this lesson.");
    }
  };

  useEffect(() => {
    console.log('Content updated:', content);
  }, [content]);

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
    if (!content || !content.exercises) return null;
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

  console.log('Rendering Lesson component', { 
    isLoading, 
    isGeneratingAudio, 
    error, 
    contentAvailable: !!content, 
    currentExerciseIndex 
  });

  if (isLoading || isGeneratingAudio) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  if (!content || !content.introduction || !Array.isArray(content.exercises) || content.exercises.length === 0) {
    return <ErrorMessage message="Invalid lesson content received. Please try again." />;
  }

  const handleNextLesson = () => {
    console.log('Navigating to next lesson');
    if (nextLessonId && onNavigateToNextLesson) {
      onNavigateToNextLesson(nextLessonId);
    }
  };

  const currentExercise = content.exercises[currentExerciseIndex];

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold mb-6 text-center text-blue-600">{lesson.title}</h2>
      <ProgressBar />
      {currentExerciseIndex === 0 && content.introduction && (
        <p className="mb-6 text-gray-700">{content.introduction}</p>
      )}
      {currentExercise && (
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
                  onClick={isListening ? stopListening : startListening}
                  className={isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}
                >
                  {isListening ? 'Stop' : 'Speak'}
                </Button>
              </div>
            </div>
          )}
          {currentExercise.type === 'speak_and_check' && (
            <div className="space-y-4">
              <p className="text-lg font-medium text-gray-800">{currentExercise.phrase}</p>
              <Button
                onClick={isListening ? stopListening : startListening}
                className={isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}
              >
                {isListening ? 'Stop' : 'Speak'}
              </Button>
            </div>
          )}
        </div>
      )}
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