'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  VStack,
  HStack,
  Progress,
  useColorModeValue,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Icon,
  Flex,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { FiLock, FiCheckCircle } from 'react-icons/fi';

const MotionBox = motion(Box);

function Curriculum({ languageCode, language }) {
  const router = useRouter();
  const { user, getToken } = useAuth();
  const [curriculum, setCurriculum] = useState(null);
  const [totalExercises, setTotalExercises] = useState(5); // Assuming each lesson has 5 exercises
  const [userProgress, setUserProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.100', 'gray.700');
  const textColor = useColorModeValue('gray.700', 'white');
  const secondaryTextColor = useColorModeValue('gray.600', 'gray.300');

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

        console.log('Generated Curriculum:', generatedCurriculum);
        console.log('User Progress:', progress);

        // Add this debug log
        console.log('Progress for lesson 1:', progress['1']);

        const totalExercises = generatedCurriculum.lessons.length;
        console.log('Total Exercises:', totalExercises);
        setTotalExercises(totalExercises);
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
    const progress = userProgress[1] || { exerciseIndex: 0, completed: false };
    const startIndex = progress.exerciseIndex;
    router.push(`/lesson/${lesson.id}?language=${encodeURIComponent(language)}&languageCode=${languageCode}&title=${encodeURIComponent(lesson.title)}&startExercise=${startIndex}`);  };

  if (!user) {
    return (
      <Container maxW="2xl" centerContent py={16}>
        <Alert status="warning" variant="subtle" flexDirection="column" alignItems="center" justifyContent="center" textAlign="center" height="200px">
          <AlertIcon boxSize="40px" mr={0} />
          <AlertTitle mt={4} mb={1} fontSize="lg">Authentication Required</AlertTitle>
          <AlertDescription maxWidth="sm">Please log in to view the curriculum.</AlertDescription>
        </Alert>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container centerContent py={16}>
        <Spinner size="xl" color="black" thickness="4px" />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxW="2xl" centerContent py={16}>
        <Alert status="error" variant="subtle" flexDirection="column" alignItems="center" justifyContent="center" textAlign="center" height="200px">
          <AlertIcon boxSize="40px" mr={0} />
          <AlertTitle mt={4} mb={1} fontSize="lg">Error</AlertTitle>
          <AlertDescription maxWidth="sm">
            {error}
            <Text mt={2}>Please try refreshing the page or selecting a different language.</Text>
          </AlertDescription>
        </Alert>
      </Container>
    );
  }

  if (!curriculum || !curriculum.lessons || curriculum.lessons.length === 0) {
    return (
      <Container maxW="2xl" centerContent py={16}>
        <Alert status="info" variant="subtle" flexDirection="column" alignItems="center" justifyContent="center" textAlign="center" height="200px">
          <AlertIcon boxSize="40px" mr={0} />
          <AlertTitle mt={4} mb={1} fontSize="lg">No Curriculum Data</AlertTitle>
          <AlertDescription maxWidth="sm">No curriculum data available. Please try again.</AlertDescription>
        </Alert>
      </Container>
    );
  }

  return (
    <Box bg={useColorModeValue('gray.50', 'gray.900')} minH="100vh" py={16}>
      <Container maxW="3xl">
        <Heading as="h1" size="2xl" textAlign="center" mb={12} color={textColor}>
          {language} Curriculum
        </Heading>
        <VStack spacing={6} align="stretch">
          {curriculum.lessons.map((lesson, index) => {
            const progress = userProgress[lesson.id] || { exerciseIndex: 0, completed: false };
            const isUnlocked = index === 0 || (userProgress[curriculum.lessons[index - 1].id]?.exerciseIndex === totalExercises);
            const progressPercentage = (progress.exerciseIndex / totalExercises) * 100;
            const isCompleted = progress.exerciseIndex === totalExercises; // Check if all exercises are completed

            return (
              <MotionBox
                key={lesson.id}
                bg={bgColor}
                borderRadius="lg"
                borderWidth="1px"
                borderColor={borderColor}
                p={6}
                shadow="md"
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <VStack align="stretch" spacing={4}>
                  {/* Lesson Title and Icon */}
                  <HStack justify="space-between">
                    <Heading as="h3" size="lg" color={textColor}>
                      {lesson.title}
                    </Heading>
                    {/* Show completion or locked icon */}
                    {isCompleted ? (
                      <Icon as={FiCheckCircle} color="green.500" boxSize={6} />
                    ) : !isUnlocked ? (
                      <Icon as={FiLock} color="gray.400" boxSize={6} />
                    ) : null}
                  </HStack>
                  <Text color={secondaryTextColor} fontSize="md">
                    {lesson.description}
                  </Text>
                  <Progress value={progressPercentage} colorScheme="blue" size="sm" borderRadius="full" />
                  <Button
                    onClick={() => startLesson(lesson)}
                    color={isUnlocked ? 'black' : 'gray'}
                    isDisabled={!isUnlocked}
                    size="md"
                    width="full"
                  >
                    {isCompleted ? 'Review' : 
                     isUnlocked ? 
                       (progress.exerciseIndex > 0 ? 'Continue' : 'Start') : 
                       'Locked'}
                  </Button>
                </VStack>
              </MotionBox>
            );
          })}
        </VStack>
      </Container>
    </Box>
  );
}

export default Curriculum;