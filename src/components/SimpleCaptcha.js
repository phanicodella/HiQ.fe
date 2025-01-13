import React, { useState, useEffect } from 'react';
import { shuffle } from 'lodash';

const SimpleCaptcha = ({ onVerify }) => {
  const [captchaText, setCaptchaText] = useState('');
  const [userInput, setUserInput] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [attempts, setAttempts] = useState(0);

  // Generate random captcha text
  const generateCaptcha = () => {
    const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setCaptchaText(result);
    setUserInput('');
    setIsValid(false);
  };

  // Initial captcha generation
  useEffect(() => {
    generateCaptcha();
  }, []);

  // Handle input change
  const handleInputChange = (e) => {
    setUserInput(e.target.value);
  };

  // Verify captcha
  const handleVerify = () => {
    const isCorrect = userInput === captchaText;
    setIsValid(isCorrect);
    setAttempts(prev => prev + 1);
    
    if (isCorrect) {
      onVerify(true);
    } else {
      if (attempts >= 2) {
        generateCaptcha();
        setAttempts(0);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-gray-100 p-4 rounded-lg">
        <div className="relative">
          <div 
            className="text-2xl font-mono tracking-wider select-none"
            style={{
              backgroundImage: 'linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)',
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
              padding: '1rem',
              textShadow: '2px 2px 3px rgba(0,0,0,0.3)',
              letterSpacing: '0.5em'
            }}
          >
            {captchaText}
          </div>
          
          <button
            onClick={generateCaptcha}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            ↻
          </button>
        </div>
      </div>

      <div className="flex space-x-2">
        <input
          type="text"
          value={userInput}
          onChange={handleInputChange}
          placeholder="Enter captcha text"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
        />
        <button
          onClick={handleVerify}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          Verify
        </button>
      </div>

      {attempts > 0 && !isValid && (
        <p className="text-red-600 text-sm">
          {attempts >= 2 ? 'Too many attempts. New captcha generated.' : 'Incorrect captcha. Please try again.'}
        </p>
      )}
    </div>
  );
};

export default SimpleCaptcha;