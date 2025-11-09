
import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { FeatureCard } from '../components/FeatureCard';
import { Spinner } from '../components/Icon';

const VideoAnalysis: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('Summarize the key events in a documentary about the Apollo 11 mission.');
  const [result, setResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!prompt) {
      setError('Please provide a prompt describing the video content.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setResult('');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: `Analyze the following video content and provide key information. Video content: ${prompt}`,
      });

      setResult(response.text);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      console.error("Error analyzing video concept:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <FeatureCard title="Video Content Analysis" description="Describe a video, and Gemini Pro will analyze its content and provide key insights. Note: This feature analyzes video concepts, not uploaded files.">
      <div className="space-y-4">
        <div>
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-2">Describe the Video Content</label>
          <textarea
            id="prompt"
            value={prompt}
            // Fix: Corrected typo from e.targe.value to e.target.value
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., Describe the plot of a short film about a robot learning to paint."
            className="w-full p-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-32"
          />
        </div>
        
        <button
          onClick={handleSubmit}
          disabled={isLoading || !prompt}
          className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg disabled:bg-gray-500 hover:bg-blue-500 transition-colors flex items-center justify-center"
        >
          {isLoading && <Spinner className="w-5 h-5 mr-2" />}
          {isLoading ? 'Analyzing...' : 'Analyze Video Content'}
        </button>

        <div>
          <h3 className="text-lg font-semibold text-gray-200 mb-2 mt-4">Analysis Result</h3>
          <div className="bg-gray-900/50 p-4 rounded-lg min-h-[200px] whitespace-pre-wrap">
            {error && <p className="text-red-400">{error}</p>}
            {result && <p>{result}</p>}
            {!error && !result && <p className="text-gray-500">Analysis will appear here...</p>}
          </div>
        </div>
      </div>
    </FeatureCard>
  );
};

export default VideoAnalysis;
