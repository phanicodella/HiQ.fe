// frontend/src/components/InterviewControls.js
import React from 'react';

export default function InterviewControls({
  isRecording,
  onStopRecording,
  onNextQuestion,
  onFinish,
  disabled,
  isLastQuestion = false
}) {
  return (
    <div className="flex items-center space-x-4">
      {/* Recording Control */}
      {isRecording ? (
        <button
          onClick={onStopRecording}
          disabled={disabled}
          className={`flex items-center px-4 py-2 rounded-md ${
            disabled
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
        >
          <svg 
            className="w-5 h-5 mr-2" 
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 002 0V8a1 1 0 00-1-1z" />
          </svg>
          Stop Recording
        </button>
      ) : (
        <div className="flex items-center space-x-4">
          {/* Next Question Button */}
          {!isLastQuestion && (
            <button
              onClick={onNextQuestion}
              disabled={disabled}
              className={`flex items-center px-4 py-2 rounded-md ${
                disabled
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              <svg 
                className="w-5 h-5 mr-2" 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              Next Question
            </button>
          )}

          {/* Finish Interview Button */}
          <button
            onClick={onFinish}
            disabled={disabled}
            className={`flex items-center px-4 py-2 rounded-md ${
              disabled
                ? 'bg-gray-300 cursor-not-allowed'
                : isLastQuestion
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  : 'bg-gray-600 hover:bg-gray-700 text-white'
            }`}
          >
            <svg 
              className="w-5 h-5 mr-2" 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            {isLastQuestion ? 'Complete Interview' : 'End Early'}
          </button>
        </div>
      )}

      {/* Interview Status Indicators */}
      <div className="ml-4 flex items-center">
        {/* Microphone Status */}
        <div className="flex items-center mr-4">
          <svg 
            className={`w-5 h-5 ${isRecording ? 'text-red-500' : 'text-gray-400'}`}
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
          </svg>
          <span className="ml-2 text-sm text-gray-600">
            {isRecording ? 'Recording' : 'Mic ready'}
          </span>
        </div>

        {/* Network Status - could be connected to actual network state */}
        <div className="flex items-center">
          <svg 
            className="w-5 h-5 text-green-500" 
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            <path fillRule="evenodd" d="M5.05 3.636a1 1 0 010 1.414 7 7 0 000 9.9 1 1 0 11-1.414 1.414 9 9 0 010-12.728 1 1 0 011.414 0zm9.9 0a1 1 0 011.414 0 9 9 0 010 12.728 1 1 0 11-1.414-1.414 7 7 0 000-9.9 1 1 0 010-1.414zM7.879 6.464a1 1 0 010 1.414 3 3 0 000 4.243 1 1 0 11-1.415 1.414 5 5 0 010-7.07 1 1 0 011.415 0zm4.242 0a1 1 0 011.415 0 5 5 0 010 7.072 1 1 0 01-1.415-1.415 3 3 0 000-4.242 1 1 0 010-1.415z" clipRule="evenodd" />
          </svg>
          <span className="ml-2 text-sm text-gray-600">Connected</span>
        </div>
      </div>
    </div>
  );
}