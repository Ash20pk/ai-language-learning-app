import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from './contexts/AuthContext';
import { ChakraProvider } from '@chakra-ui/react';
import Navigation from './components/Navigation';

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata = {
  title: "Language Learning App",
  description: "An interactive language learning application",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <ChakraProvider>
        <AuthProvider>
          <Navigation />
          <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            {children}
          </main>
        </AuthProvider>
        </ChakraProvider>
      </body>
    </html>
  );
}
