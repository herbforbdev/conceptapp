import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { LanguageProvider } from '@/context/LanguageContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Concept App',
  description: 'Ice and Water Production Management',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
} 