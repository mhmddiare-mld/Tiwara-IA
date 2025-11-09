
import React from 'react';

interface ApiKeyDialogProps {
  onSelectKey: () => void;
}

export const ApiKeyDialog: React.FC<ApiKeyDialogProps> = ({ onSelectKey }) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl shadow-2xl p-8 max-w-md w-full ring-1 ring-white/10">
        <h2 className="text-2xl font-bold text-white mb-4">API Key Required</h2>
        <p className="text-gray-300 mb-6">
          Video generation with Veo requires a Google AI Studio API key. Please select your key to proceed.
        </p>
        <p className="text-sm text-gray-400 mb-6">
          For information on pricing and to set up billing, please visit the{' '}
          <a 
            href="https://ai.google.dev/gemini-api/docs/billing" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-blue-400 hover:text-blue-300 underline"
          >
            billing documentation
          </a>.
        </p>
        <button
          onClick={onSelectKey}
          className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-transform transform hover:scale-105"
        >
          Select API Key
        </button>
      </div>
    </div>
  );
};
