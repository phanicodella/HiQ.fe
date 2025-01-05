import React from 'react';

const GuidelinesModal = ({ onAccept, onDecline }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6">Interview Guidelines & Agreement</h2>
        
        <div className="space-y-4 mb-8">
          <p className="text-gray-700">By proceeding with this interview, you agree to:</p>
          
          <ul className="list-disc list-inside space-y-2 text-gray-600">
            <li>Complete the interview independently without assistance</li>
            <li>Not use external resources or references unless explicitly permitted</li>
            <li>Maintain a stable internet connection throughout the interview</li>
            <li>Keep your camera and microphone on during the entire session</li>
            <li>Follow all instructions provided during the interview</li>
          </ul>

          <div className="bg-blue-50 p-4 rounded-lg mt-4">
            <h3 className="font-semibold text-blue-800 mb-2">Technical Requirements:</h3>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>Working webcam and microphone</li>
              <li>Stable internet connection</li>
              <li>Quiet environment</li>
              <li>Well-lit room for video clarity</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            onClick={onDecline}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Decline
          </button>
          <button
            onClick={onAccept}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Accept & Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuidelinesModal;