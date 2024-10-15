'use client';

import React from 'react';
import ProfilePage from '../components/ProfilePage';
import { Box } from '@chakra-ui/react';

export default function Profile() {
  return (
    <Box minH="100vh" bg="gray.50">
      <ProfilePage />
    </Box>
  );
}
