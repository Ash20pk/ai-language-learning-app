import React from 'react';
import { Input } from '@chakra-ui/react';
import useTypewriter from '../hooks/useTypewriterEffect';

const AnimatedInput = ({ size, value, onChange, borderColor, ...props }) => {
  const placeholders = [
    'Search for a language',
    'Rechercher une langue',
    'Buscar un idioma',
    'Suche nach einer Sprache',
    '言語を検索',
    'Buscar uma língua',
  ];

  const typedPlaceholder = useTypewriter(placeholders, 90, 1000, 90);

  return (
    <Input
      size={size}
      placeholder={typedPlaceholder}
      value={value}
      onChange={onChange}
      borderColor={borderColor}
      {...props}
    />
  );
};

export default AnimatedInput;