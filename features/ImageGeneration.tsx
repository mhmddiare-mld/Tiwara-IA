
import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { FeatureCard } from '../components/FeatureCard';
import { Spinner } from '../components/Icon';

const ImageGeneration: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('A photorealistic image of a futuristic city at sunset, with flying cars and holographic advertisements.');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!prompt) {
      setError('Please provide a prompt.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '16:9',
        },
      });

      if (response.generatedImages.length > 0) {
        const base64ImageBytes = response.generatedImages[0].image.imageBytes;
        setGeneratedImage(`data:image/jpeg;base64,${base64ImageBytes}`);
      } else {
        setError('Image generation failed. No image was returned.');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      console.error("Error generating image:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <FeatureCard title="Image Generation" description="Generate high-quality images from text prompts using Imagen 4.">
      <div className="space-y-4">
        <div>
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-2">Your Prompt</label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., A majestic lion wearing a crown, oil painting style."
            className="w-full p-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
          />
        </div>
        
        <button
          onClick={handleSubmit}
          disabled={isLoading || !prompt}
          className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg disabled:bg-gray-500 hover:bg-blue-500 transition-colors flex items-center justify-center"
        >
          {isLoading && <Spinner className="w-5 h-5 mr-2" />}
          {isLoading ? 'Generating...' : 'Generate Image'}
        </button>

        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-200 mb-2">Generated Image</h3>
          <div className="bg-gray-900/50 p-4 rounded-lg min-h-[200px] flex items-center justify-center">
            {error && <p className="text-red-400">{error}</p>}
            {isLoading && <Spinner className="w-10 h-10 text-blue-400"/>}
            {generatedImage && <img src={generatedImage} alt="Generated" className="max-w-full h-auto rounded-lg" />}
            {!isLoading && !generatedImage && !error && <p className="text-gray-500">Your generated image will appear here.</p>}
          </div>
        </div>
      </div>
    </FeatureCard>
  );
};

export default ImageGeneration;
