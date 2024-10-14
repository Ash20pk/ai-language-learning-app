'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Box,
  Heading,
  Text,
  Button,
  Progress,
  Alert,
  AlertIcon,
  Spinner,
  VStack,
  HStack,
  Center,
  Container,
  Flex,
  IconButton,
  Tooltip,
} from '@chakra-ui/react';
import { FaPlay, FaMicrophone, FaMicrophoneSlash, FaArrowRight } from 'react-icons/fa';

function Lesson({ lesson, language, languageCode, onComplete, nextLessonId, onNavigateToNextLesson }) {
  const { user, getToken } = useAuth();
  const [content, setContent] = useState(null);
  const [userProgress, setUserProgress] = useState(null);
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
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [unlockedExercises, setUnlockedExercises] = useState([0]); // Start with the first exercise unlocked

  const memoizedLesson = useMemo(() => lesson, [lesson]);
  const memoizedUser = useMemo(() => user, [user]);

  useEffect(() => {
    console.log('useEffect triggered');
    async function fetchLessonContentAndProgress() {
      if (!memoizedUser) return;

      try {
        setIsLoading(true);
        const token = await getToken();

        const [lessonResponse, progressResponse] = await Promise.all([
          fetch('/api/generate-lesson', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
              language, 
              languageCode, 
              lessonTitle: memoizedLesson.title,
              lessonId: memoizedLesson.id
            }),
          }),
          fetch(`/api/user-progress?userId=${memoizedUser.id}&languageCode=${languageCode}&lessonId=${memoizedLesson.id}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }),
        ]);

        if (!lessonResponse.ok || !progressResponse.ok) {
          throw new Error('Failed to fetch data');
        }

        const [lessonData, progressData] = await Promise.all([
          lessonResponse.json(),
          progressResponse.json(),
        ]);

        console.log('Received lesson content:', lessonData);
        if (!lessonData || !lessonData.content || !lessonData.content.exercises || !Array.isArray(lessonData.content.exercises)) {
          throw new Error('Invalid lesson content structure received');
        }

        setContent(lessonData.content);
        setUserProgress(progressData);
        console.log('Content set in state:', lessonData.content);
        await prepareAudio(lessonData.content.exercises);
      } catch (err) {
        console.error('Error fetching lesson content:', err);
        setError(`Failed to generate lesson content: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    }

    if (memoizedUser) {
      fetchLessonContentAndProgress();
    }
  }, [memoizedLesson, language, languageCode, memoizedUser, getToken]);

  const prepareAudio = async (exercises) => {
    console.log('Preparing audio');
    setIsGeneratingAudio(true);
    const newAudioCache = { ...audioCache };
    for (const exercise of exercises) {
      if (exercise.type === 'listen_and_repeat' && exercise.audio) {
        newAudioCache[exercise.phrase] = exercise.audio;
      }
    }
    setAudioCache(newAudioCache);
    setIsGeneratingAudio(false);
    console.log('Audio preparation complete');
    await playGuidedAudio(`Welcome to the lesson: ${memoizedLesson.title}. Let's begin with the first exercise.`);
  };

  const generateAudio = async (text, lang = 'en') => {
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

  const playGuidedAudio = useCallback(async (text, targetLanguage) => {
    console.log('Playing guided audio:', text, 'in language:', targetLanguage);
    if (isPlayingGuidedAudio) {
      console.log('Guided audio is already playing. Skipping:', text);
      return;
    }
    
    setIsPlayingGuidedAudio(true);
    try {
      const parts = text.split(/(".*?")/);
      
      for (const part of parts) {
        if (part.startsWith('"') && part.endsWith('"')) {
          const targetText = part.slice(1, -1);
          if (audioCache[targetText]) {
            guidedAudioRef.current.src = audioCache[targetText];
            await guidedAudioRef.current.play();
          } else {
            const audioBlob = await generateAudio(targetText, targetLanguage);
            await playAudioBlob(audioBlob);
          }
        } else if (part.trim() !== '') {
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
  }, [isPlayingGuidedAudio, audioCache]);

  const speakPhrase = async (phrase) => {
    console.log('Speaking phrase:', phrase);
    try {
      if (audioCache[phrase]) {
        const audio = new Audio(audioCache[phrase]);
        await audio.play();
      } else {
        console.error('Audio not found for phrase:', phrase);
        await regenerateAndPlayAudio(phrase);
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      setFeedback("There was an error playing the audio. Please try again.");
    }
    await playGuidedAudio("Now, please repeat the phrase.", language);
  };

  const regenerateAndPlayAudio = async (phrase) => {
    try {
      const audioBlob = await generateAudio(phrase, language);
      const base64Audio = await blobToBase64(audioBlob);
      const audio = new Audio(base64Audio);
      await audio.play();
      // Update the cache with the new audio
      setAudioCache(prevCache => ({
        ...prevCache,
        [phrase]: base64Audio
      }));
    } catch (error) {
      console.error('Error regenerating audio:', error);
      setFeedback("There was an error generating the audio. Please try again.");
    }
  };

  const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
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
    const threshold = 0.95; // You can adjust this threshold as needed

    let feedbackMessage;
    if (similarity >= threshold) {
      console.log('Answer is correct');
      feedbackMessage = "Excellent! That's correct.";
      setFeedback(feedbackMessage);
      setCorrectAnswers(prev => prev + 1);
      // Unlock the next exercise if it exists
      if (currentExerciseIndex + 1 < content.exercises.length) {
        setUnlockedExercises(prev => [...prev, currentExerciseIndex + 1]);
      }
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
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };
        mediaRecorderRef.current.start();
      })
      .catch(error => {
        console.error('Error accessing microphone:', error);
        setFeedback('Unable to access microphone. Please check your settings and try again.');
      });
  }, []);

  const transcribeAudio = async (audioBlob) => {
    console.log('Transcribing audio, blob size:', audioBlob.size);
    
    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio.webm');
    formData.append('language', language);
  
    console.log('Sending transcription request for language:', language);
  
    try {
      const response = await fetch('/api/transcribe-audio', {
        method: 'POST',
        body: formData,
      });
  
      console.log('Received response from transcribe-audio API, status:', response.status);
  
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Transcription API error:', errorData);
        throw new Error(errorData.error || 'Failed to transcribe audio');
      }
  
      const data = await response.json();
      console.log('Transcription API response:', data);
  
      if (!data.text) {
        throw new Error('No transcription text received');
      }
      return data.text;
    } catch (error) {
      console.error('Transcription error:', error);
      setFeedback('Sorry, there was an error processing your speech. Please try again.');
      return null;
    }
  };

  const stopRecording = useCallback(async () => {
    console.log('Stopping recording');
    setIsListening(false);
    setIsTranscribing(true);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      return new Promise((resolve) => {
        mediaRecorderRef.current.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          console.log('Recording stopped, blob size:', audioBlob.size);
          try {
            const transcription = await transcribeAudio(audioBlob);
            if (transcription) {
              await checkAnswer(transcription);
            }
          } catch (error) {
            console.error('Transcription error:', error);
            setFeedback('Sorry, there was an error processing your speech. Please try again.');
          } finally {
            setIsTranscribing(false);
            resolve();
          }
        };
        mediaRecorderRef.current.stop();
      });
    } else {
      console.log('MediaRecorder is not active');
      setIsTranscribing(false);
    }
  }, [checkAnswer, transcribeAudio]);

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

  const saveProgress = async (exerciseIndex, completed = false) => {
    try {
      const token = await getToken();
      const response = await fetch('/api/save-progress', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: memoizedUser.id,
          languageCode,
          lessonId: memoizedLesson.id,
          exerciseIndex,
          completed,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save progress');
      }
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const nextExercise = async () => {
    console.log('Moving to next exercise');
    if (currentExerciseIndex < content.exercises.length - 1) {
      const nextIndex = currentExerciseIndex + 1;
      if (unlockedExercises.includes(nextIndex)) {
        setCurrentExerciseIndex(nextIndex);
        setFeedback(null);
        await saveProgress(nextIndex);
        const nextMessage = "Great! Let's move on to the next phrase.";
        playGuidedAudio(nextMessage);
      } else {
        setFeedback("Please complete the current exercise correctly before moving to the next one.");
      }
    } else {
      console.log('Lesson completed');
      const allExercisesCorrect = correctAnswers === content.exercises.length;
      await saveProgress(currentExerciseIndex, allExercisesCorrect);
      onComplete();
      const completionMessage = allExercisesCorrect 
        ? "Congratulations! You've completed this lesson perfectly." 
        : "You've finished the lesson, but some answers were incorrect. You may want to review this lesson later.";
      playGuidedAudio(completionMessage);
    }
  };

  useEffect(() => {
    console.log('Content updated:', content);
  }, [content]);

  // UI Components
  const LoadingSpinner = () => (
    <Center h="100vh">
      <Spinner size="xl" color="blue.500" thickness="4px" speed="0.65s" />
    </Center>
  );

  const ErrorMessage = ({ message }) => (
    <Container maxW="xl" centerContent>
      <Alert status="error" variant="subtle" flexDirection="column" alignItems="center" justifyContent="center" textAlign="center" height="200px" bg="red.50" rounded="xl">
        <AlertIcon boxSize="40px" mr={0} />
        <Text fontWeight="bold" fontSize="xl" mt={4}>Error</Text>
        <Text mt={2}>{message}</Text>
        <Text mt={2}>Please try refreshing the page or selecting a different lesson.</Text>
      </Alert>
    </Container>
  );

  const ProgressBar = () => {
    if (!content || !content.exercises) return null;
    const progress = (currentExerciseIndex / content.exercises.length) * 100;
    return (
      <Progress value={progress} colorScheme="blue" size="sm" rounded="full" />
    );
  };

  const ExercisePrompt = ({ prompt }) => (
    <Text fontSize="xl" fontWeight="medium" mb={4} color="gray.700">{prompt}</Text>
  );

  if (!memoizedUser) {
    return (
      <Container maxW="xl" centerContent>
        <Box p={8} mt={10} bg="white" rounded="xl" shadow="lg" textAlign="center">
          <Heading as="h2" size="xl" mb={6} color="blue.600">Please log in to access lessons</Heading>
        </Box>
      </Container>
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
    <Container maxW="xl" py={8}>
      <VStack spacing={6} align="stretch">
        <Heading as="h2" size="xl" textAlign="center" color="blue.600">{memoizedLesson.title}</Heading>
        <ProgressBar />
        {currentExerciseIndex === 0 && content && content.introduction && (
          <Text color="gray.600" fontSize="lg" textAlign="center">{content.introduction}</Text>
        )}
        {content && content.exercises && content.exercises[currentExerciseIndex] && (
          <Box bg="gray.50" p={6} rounded="xl" shadow="md">
            <ExercisePrompt prompt={content.exercises[currentExerciseIndex].prompt} />
            <VStack spacing={4} align="stretch">
              <Text fontSize="xl" fontWeight="bold" color="gray.800">{content.exercises[currentExerciseIndex].phrase}</Text>
              <Text color="gray.600" fontStyle="italic">{content.exercises[currentExerciseIndex].translation}</Text>
              <Flex justify="center" mt={4}>
                <Tooltip label="Listen">
                  <IconButton
                    icon={<FaPlay />}
                    onClick={() => speakPhrase(content.exercises[currentExerciseIndex].phrase)}
                    colorScheme="blue"
                    size="lg"
                    isRound
                    mr={4}
                  />
                </Tooltip>
                <Tooltip label={isListening ? 'Stop' : 'Speak'}>
                  <IconButton
                    icon={isListening ? <FaMicrophoneSlash /> : <FaMicrophone />}
                    onClick={isListening ? stopRecording : startRecording}
                    colorScheme={isListening ? 'red' : 'green'}
                    size="lg"
                    isRound
                    isDisabled={isTranscribing}
                  />
                </Tooltip>
              </Flex>
            </VStack>
          </Box>
        )}
        {feedback && (
          <Alert status={feedback.startsWith('Excellent') ? 'success' : 'error'} variant="subtle" rounded="md">
            <AlertIcon />
            <Text fontWeight="medium">{feedback}</Text>
          </Alert>
        )}
        {feedback && feedback.startsWith('Excellent') && (
          <Center>
            <Button
              rightIcon={<FaArrowRight />}
              onClick={currentExerciseIndex < content.exercises.length - 1 ? nextExercise : onComplete}
              colorScheme="blue"
              size="lg"
            >
              {currentExerciseIndex < content.exercises.length - 1 ? 'Next Phrase' : 'Complete Lesson'}
            </Button>
          </Center>
        )}
        {feedback && feedback.startsWith('Excellent') && currentExerciseIndex === content.exercises.length - 1 && nextLessonId && onNavigateToNextLesson && (
          <Center mt={4}>
            <Button
              rightIcon={<FaArrowRight />}
              onClick={handleNextLesson}
              colorScheme="green"
              variant="outline"
              size="lg"
            >
              Next Lesson
            </Button>
          </Center>
        )}
      </VStack>
    </Container>
  );
}

export default Lesson;