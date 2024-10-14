'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import {
  Box,
  Container,
  Heading,
  Input,
  Button,
  SimpleGrid,
  Text,
  VStack,
  useColorModeValue,
  Spinner,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';

const MotionBox = motion(Box);

function LanguageSelector() {
  const [searchTerm, setSearchTerm] = useState('');
  const [userLanguages, setUserLanguages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { user, getToken } = useAuth();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('blue.500', 'blue.300');

  useEffect(() => {
    async function fetchUserLanguages() {
      if (!user) return;

      try {
        const token = await getToken();
        const response = await fetch('/api/user-languages', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch user languages');
        }

        const data = await response.json();
        // Remove duplicates and capitalize first letter
        const uniqueLanguages = Array.from(new Set(data.languages.map(lang => lang.code)))
          .map(code => {
            const language = data.languages.find(lang => lang.code === code);
            return {
              ...language,
              name: language.name.charAt(0).toUpperCase() + language.name.slice(1)
            };
          });
        setUserLanguages(uniqueLanguages);
      } catch (error) {
        console.error('Error fetching user languages:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchUserLanguages();
  }, [user, getToken]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (searchTerm) {
      const languageCode = searchTerm.toLowerCase().slice(0, 2);
      const languageName = searchTerm.trim();

      try {
        const token = await getToken();
        await fetch('/api/user-languages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ languageCode, languageName })
        });

        router.push(`/curriculum/${languageCode}?name=${encodeURIComponent(languageName)}`);
      } catch (error) {
        console.error('Error adding user language:', error);
      }
    }
  };

  const handleLanguageSelect = (language) => {
    router.push(`/curriculum/${language.code}?name=${encodeURIComponent(language.name)}`);
  };

  if (isLoading) {
    return (
      <Container maxW="4xl" py={16}>
        <VStack spacing={8} align="stretch">
          <Heading as="h1" size="2xl" textAlign="center" color="blue.500">
            Loading Your Language Journey
          </Heading>
          <Box textAlign="center">
            <Spinner size="xl" color="blue.500" />
          </Box>
        </VStack>
      </Container>
    );
  }

  return (
    <Container maxW="4xl" py={16}>
      <VStack spacing={8} align="stretch">
        <Heading as="h1" size="2xl" textAlign="center" color="blue.500">
          Discover Your Next Language Adventure
        </Heading>
        
        <Box as="form" onSubmit={handleSearch}>
          <VStack spacing={4}>
            <Input
              size="lg"
              placeholder="Search for a language"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              borderColor={borderColor}
              _hover={{ borderColor: 'blue.300' }}
              _focus={{ borderColor: 'blue.500', boxShadow: 'outline' }}
            />
            <Button
              colorScheme="blue"
              size="lg"
              type="submit"
              width="full"
            >
              Explore
            </Button>
          </VStack>
        </Box>

        {userLanguages.length > 0 && (
          <Box>
            <Heading as="h2" size="xl" mb={4} color="blue.400">
              Continue Learning
            </Heading>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
              {userLanguages.map((language) => (
                <MotionBox
                  key={language.code}
                  as="button"
                  onClick={() => handleLanguageSelect(language)}
                  bg={bgColor}
                  p={6}
                  borderRadius="lg"
                  boxShadow="md"
                  textAlign="left"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <VStack align="start" spacing={2}>
                    <Text fontSize="xl" fontWeight="bold">{language.name}</Text>
                    <Text color="gray.500">Continue your {language.name} journey!</Text>
                  </VStack>
                </MotionBox>
              ))}
            </SimpleGrid>
          </Box>
        )}
      </VStack>
    </Container>
  );
}

export default LanguageSelector;
