import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { LanguageProvider } from '@/context/LanguageContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Concept App',
  description: 'Ice and Water Production Management',
};

// Add global error handler to catch React Error #130
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (event.error && event.error.message && event.error.message.includes('Objects are not valid as a React child')) {
      console.error('🔥 React Error #130 Caught!');
      console.error('Error message:', event.error.message);
      console.error('Stack trace:', event.error.stack);
      console.error('Event:', event);
      
      // Try to find the problematic object
      const stack = event.error.stack;
      console.error('🔍 Check these components in the stack trace:', stack);
    }
  });
  
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && event.reason.message && event.reason.message.includes('Objects are not valid as a React child')) {
      console.error('🔥 React Error #130 Caught via Promise Rejection!');
      console.error('Reason:', event.reason);
    }
  });
}

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