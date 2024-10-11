'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import Curriculum from '../../components/Curriculum';

export default function CurriculumPage({ params }) {
  const searchParams = useSearchParams();
  const languageName = searchParams.get('name');
  
  return <Curriculum languageCode={params.languageCode} language={languageName} />;
}