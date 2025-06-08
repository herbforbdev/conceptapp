import React from 'react';
import { Button } from 'flowbite-react';
import { HiRefresh } from 'react-icons/hi';

const ErrorMessage = ({ message, onRetry }) => {
  return (
    <div className="min-h-screen p-4 md:p-8 bg-gray-100">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <p className="text-red-800">{message}</p>
        {onRetry && (
          <Button
            color="failure"
            size="sm"
            onClick={onRetry}
            className="mt-2"
          >
            <HiRefresh className="mr-2 h-4 w-4" />
            Retry
          </Button>
        )}
      </div>
    </div>
  );
};

export default ErrorMessage; 