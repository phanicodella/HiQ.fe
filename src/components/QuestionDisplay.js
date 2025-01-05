// frontend/src/components/QuestionDisplay.js
import React from 'react';

export default function QuestionDisplay({ question, isRecording }) {
  return (
    <div className="space-y-4">
      {/* Question Text */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Current Question
        </h3>
        <p className="text-gray-700">{question.text}</p>
        
        {question.hints && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-900 mb-1">Hints:</h4>
            <ul className="list-disc list-inside text-sm text-gray-600">
              {question.hints.map((hint, index) => (
                <li key={index}>{hint}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Recording Status */}
      <div className="flex items-center">
        <div className={`h-3 w-3 rounded-full mr-2 ${
          isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-300'
        }`} />
        <span className="text-sm text-gray-600">
          {isRecording ? 'Recording in progress...' : 'Recording stopped'}
        </span>
      </div>

      {/* Timer (if needed) */}
      {question.timeLimit && (
        <div className="text-sm text-gray-600">
          Time remaining: {question.timeLimit} seconds
        </div>
      )}
    </div>
  );
}