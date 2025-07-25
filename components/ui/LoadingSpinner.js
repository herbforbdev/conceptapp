import React from 'react';

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center w-full py-10">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
    </div>
  );
} 