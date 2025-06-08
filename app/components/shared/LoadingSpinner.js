import React from 'react';

const LoadingSpinner = () => {
  return (
    <div className="min-h-screen p-4 md:p-8 bg-gray-100">
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600">Loading data...</p>
        </div>
      </div>
    </div>
  );
};

export default LoadingSpinner; 