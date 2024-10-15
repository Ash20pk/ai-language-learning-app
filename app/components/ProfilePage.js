import React, { useEffect, useState } from 'react';
import {
  Box,
  VStack,
  Heading,
  Text,
  Container,
  Avatar,
  Progress,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Spinner,
  Center,
  Divider,
} from '@chakra-ui/react';
import { useAuth } from '../contexts/AuthContext';

function ProfilePage() {
  const { user, getToken } = useAuth();
  const [userProgress, setUserProgress] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchUserProgress() {
      if (!user) return;

      try {
        const token = await getToken();
        const response = await fetch('/api/user-progress', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch user progress');
        }

        const data = await response.json();
        setUserProgress(data);
      } catch (error) {
        console.error('Error fetching user progress:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchUserProgress();
  }, [user, getToken]);

  if (isLoading) {
    return (
      <Center h="100vh">
        <Spinner size="xl" color="blue.500" />
      </Center>
    );
  }

  if (!user) {
    return (
      <Center h="100vh">
        <Text>Please log in to view your profile.</Text>
      </Center>
    );
  }

  return (
    <Container maxW="container.xl" py={10}>
      <VStack spacing={8} align="stretch">
        <Box textAlign="center">
          <Avatar size="2xl" name={user.name} src={user.photoURL} mb={4} />
          <Heading as="h1" size="xl">{user.name}</Heading>
          <Text color="gray.600">{user.email}</Text>
        </Box>

        <Divider />

        <Box>
          <Heading as="h2" size="lg" mb={4}>Learning Progress</Heading>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={10}>
            <Stat>
              <StatLabel>Total Lessons Completed</StatLabel>
              <StatNumber>{userProgress?.totalLessonsCompleted || 0}</StatNumber>
              <StatHelpText>Across all languages</StatHelpText>
            </Stat>
            <Stat>
              <StatLabel>Languages Learning</StatLabel>
              <StatNumber>{userProgress?.languagesLearning?.length || 0}</StatNumber>
              <StatHelpText>{userProgress?.languagesLearning?.join(', ') || 'None yet'}</StatHelpText>
            </Stat>
          </SimpleGrid>
        </Box>

        <Divider />

        <Box>
          <Heading as="h2" size="lg" mb={4}>Language Progress</Heading>
          {userProgress?.languageProgress ? (
            Object.entries(userProgress.languageProgress).map(([language, progress]) => (
              <Box key={language} mb={6}>
                <Text fontWeight="bold" mb={2}>{language}</Text>
                <Progress value={progress} colorScheme="blue" size="lg" />
                <Text mt={1} fontSize="sm" color="gray.600">{progress}% Complete</Text>
              </Box>
            ))
          ) : (
            <Text>No language progress data available.</Text>
          )}
        </Box>

        <Divider />

        <Box>
          <Heading as="h2" size="lg" mb={4}>Recent Activity</Heading>
          {userProgress?.recentActivity ? (
            userProgress.recentActivity.map((activity, index) => (
              <Box key={index} mb={3}>
                <Text fontWeight="bold">{activity.action}</Text>
                <Text fontSize="sm" color="gray.600">{new Date(activity.timestamp).toLocaleString()}</Text>
              </Box>
            ))
          ) : (
            <Text>No recent activity data available.</Text>
          )}
        </Box>
      </VStack>
    </Container>
  );
}

export default ProfilePage;
