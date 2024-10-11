'use client';

import React from 'react';
import Curriculum from '../../components/Curriculum';

export default function CurriculumPage({ params }) {
  return <Curriculum languageCode={params.languageCode} />;
}