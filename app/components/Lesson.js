'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

function Lesson({ lesson, language, onComplete, nextLessonId, onNavigateToNextLesson }) {
  const { user } = useAuth();
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
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

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

  const generateAudio = async (text, lang) => {
    console.log('Generating audio for:', text, 'in language:', lang);
    const response = await fetch('/api/generate-audio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, language: lang }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate audio');
    }

    return await response.blob();
  };

  const playAudioBlob = async (audioBlob) => {
    const audioUrl = URL.createObjectURL(audioBlob);
    guidedAudioRef.current.src = audioUrl;
    await new Promise((resolve) => {
      guidedAudioRef.current.onended = () => {
        URL.revokeObjectURL(audioUrl);
        resolve();
      };
      guidedAudioRef.current.play();
    });
  };

  const playGuidedAudio = useCallback(async (text, targetLanguage = 'en') => {
    console.log('Playing guided audio:', text, 'in language:', targetLanguage);
    if (isPlayingGuidedAudio) {
      console.log('Guided audio is already playing. Skipping:', text);
      return;
    }
    
    setIsPlayingGuidedAudio(true);
    try {
      // Split the text into parts, keeping the quotation marks
      const parts = text.split(/(".*?")/);
      
      for (const part of parts) {
        if (part.startsWith('"') && part.endsWith('"')) {
          // This part is in the target language (quoted phrase)
          const targetText = part.slice(1, -1); // Remove quotes
          const audioBlob = await generateAudio(targetText, targetLanguage);
          await playAudioBlob(audioBlob);
        } else if (part.trim() !== '') {
          // This part is in English
          const audioBlob = await generateAudio(part, 'en');
          await playAudioBlob(audioBlob);
        }
      }
    } catch (error) {
      console.error('Error playing guided audio:', error);
    } finally {
      setIsPlayingGuidedAudio(false);
      console.log('Guided audio playback ended');
    }
  }, [isPlayingGuidedAudio, generateAudio, playAudioBlob]);

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
    await playGuidedAudio("Now, please repeat the phrase.", language);
  };

  const checkAnswer = useCallback(async (transcribedText) => {
    console.log('Checking answer. Transcribed text:', transcribedText);

    if (!content || !Array.isArray(content.exercises) || currentExerciseIndex < 0 || currentExerciseIndex >= content.exercises.length) {
      console.error('Invalid content or exercise index');
      setFeedback('Sorry, there was an error checking your answer. Please try again.');
      return;
    }

    const currentExercise = content.exercises[currentExerciseIndex];
    const correctAnswer = currentExercise.phrase;

    const normalizedTranscribedText = transcribedText.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim();
    const normalizedCorrectAnswer = correctAnswer.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim();

    const similarity = stringSimilarity(normalizedTranscribedText, normalizedCorrectAnswer);
    const threshold = 0.97; // You can adjust this threshold as needed

    let feedbackMessage;
    if (similarity >= threshold) {
      console.log('Answer is correct');
      feedbackMessage = "Excellent! That's correct.";
      setFeedback(feedbackMessage);
    } else {
      console.log('Answer is incorrect');
      feedbackMessage = `Not quite. The correct phrase is: "${correctAnswer}". Let's try again.`;
      setFeedback(feedbackMessage);
    }
    
    await playGuidedAudio(feedbackMessage, language);
  }, [content, currentExerciseIndex, language, playGuidedAudio]);

  const startRecording = useCallback(() => {
    console.log('Starting recording');
    setIsListening(true);
    setFeedback(null);
    audioChunksRef.current = [];

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        mediaRecorderRef.current = new MediaRecorder(stream);
        mediaRecorderRef.current.ondataavailable = (event) => {
          audioChunksRef.current.push(event.data);
        };
        mediaRecorderRef.current.start();
      })
      .catch(error => {
        console.error('Error accessing microphone:', error);
        setFeedback('Unable to access microphone. Please check your settings and try again.');
      });
  }, []);

  const stopRecording = useCallback(async () => {
    console.log('Stopping recording');
    setIsListening(false);
    setIsTranscribing(true);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        try {
          const transcription = await transcribeAudio(audioBlob);
          checkAnswer(transcription);
        } catch (error) {
          console.error('Transcription error:', error);
          setFeedback('Sorry, there was an error processing your speech. Please try again.');
        } finally {
          setIsTranscribing(false);
        }
      };
    }
  }, [checkAnswer]);

  const transcribeAudio = async (audioBlob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio.webm');
    formData.append('language', language);

    const response = await fetch('/api/transcribe-audio', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to transcribe audio');
    }

    const data = await response.json();
    return data.text;
  };

  // Simple string similarity function (Levenshtein distance)
  const stringSimilarity = (a, b) => {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return 1 - (matrix[b.length][a.length] / Math.max(a.length, b.length));
  };

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

  const startListening = useCallback(() => {
    console.log('Starting listening, content:', content);
    if (!content || !content.exercises || content.exercises.length <= currentExerciseIndex) {
      console.error('Lesson content not available', { content, currentExerciseIndex });
      setFeedback('Sorry, the lesson is not ready yet. Please wait a moment and try again.');
      return;
    }

    if (!isRecognitionInitialized.current) {
      initializeSpeechRecognition();
    }

    if (recognition.current) {
      setIsListening(true);
      setFeedback(null);
      recognition.current.start();
    } else {
      console.error('Speech recognition not initialized');
      setFeedback('Sorry, speech recognition is not available. Please try again.');
    }
  }, [content, currentExerciseIndex, initializeSpeechRecognition]);

  const stopListening = useCallback(() => {
    console.log('Stopping listening');
    if (recognition.current) {
      recognition.current.stop();
    }
    setIsListening(false);
  }, []);

  const nextExercise = async () => {
    console.log('Moving to next exercise');
    if (currentExerciseIndex < content.exercises.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
      setFeedback(null);
      const nextMessage = await translateFeedback("Great! Let's move on to the next phrase.", language);
      playGuidedAudio(nextMessage);
    } else {
      console.log('Lesson completed');
      onComplete();
      const completionMessage = await translateFeedback("Congratulations! You've completed this lesson.", language);
      playGuidedAudio(completionMessage);
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

  const Button = ({ onClick, className, children, disabled }) => (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-md font-semibold text-white transition-colors duration-200 ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      disabled={disabled}
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

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <h2 className="text-3xl font-bold mb-6 text-center text-blue-600">Please log in to access lessons</h2>
      </div>
    );
  }

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
                onClick={isListening ? stopRecording : startRecording}
                className={isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}
                disabled={isTranscribing}
              >
                {isListening ? 'Stop' : isTranscribing ? 'Transcribing...' : 'Speak'}
              </Button>
            </div>
          </div>
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
              Next Phrase
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