import React, { useState, useEffect, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
import { FeatureCard } from '../components/FeatureCard';
import { Spinner } from '../components/Icon';
import { fileToBase64 } from '../services/utils';
import { useVeoApiKey } from '../hooks/useVeoApiKey';
import { ApiKeyDialog } from '../components/ApiKeyDialog';

const loadingMessages = [
    "Warming up the digital director's chair...",
    "Choreographing pixels into motion...",
    "Rendering the first few frames...",
    "This can take a few minutes. Great art needs patience!",
    "Assembling the final cut...",
    "Almost there, adding the final polish...",
];

const predefinedPrompts = {
    'Hologram Cat': 'A neon hologram of a cat driving at top speed.',
    'Surreal Whale': 'A majestic whale swimming through the clouds in a surreal, dreamlike sky.',
    'Futuristic City': 'A time-lapse of a futuristic city being built from the ground up, with advanced technology.',
    'Rain Drop': 'A close-up shot of a single drop of rain falling into a puddle, with extreme slow motion and ripples.',
    'Enchanted Forest': 'An enchanted forest at night, with glowing mushrooms and mystical creatures peeking from behind trees.',
};

const VideoGeneration: React.FC = () => {
  const { isKeySelected, isChecking, selectApiKey, resetKeySelection } = useVeoApiKey();
  const [prompt, setPrompt] = useState<string>(predefinedPrompts['Hologram Cat']);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fix: Changed NodeJS.Timeout to number for browser compatibility.
    let interval: number;
    if (isLoading) {
      setLoadingMessage(loadingMessages[0]);
      let i = 1;
      // Fix: Use `window.setInterval` to ensure the return type is `number`, resolving the conflict with `NodeJS.Timeout`.
      interval = window.setInterval(() => {
        setLoadingMessage(loadingMessages[i % loadingMessages.length]);
        i++;
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [isLoading]);
  
  const handlePromptSelection = (selectedPrompt: string) => {
    setPrompt(selectedPrompt);
    setGeneratedVideoUrl(null);
    setError(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const pollOperation = useCallback(async (operation: any, ai: GoogleGenAI) => {
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      try {
        operation = await ai.operations.getVideosOperation({ operation: operation });
      } catch (opError) {
        console.error("Polling error:", opError);
        throw new Error("Failed to get operation status.");
      }
    }
    return operation;
  }, []);

  const handleSubmit = async () => {
    if (!prompt) {
      setError('Please provide a prompt.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedVideoUrl(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      
      let imagePayload;
      if (image) {
        const base64Image = await fileToBase64(image);
        imagePayload = {
          imageBytes: base64Image,
          mimeType: image.type,
        };
      }
      
      let initialOperation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        ...(imagePayload && { image: imagePayload }),
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: aspectRatio,
        }
      });

      const completedOperation = await pollOperation(initialOperation, ai);

      const downloadLink = completedOperation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        // Must append API key to fetch video
        const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        if (!videoResponse.ok) {
            throw new Error(`Failed to fetch video: ${videoResponse.statusText}`);
        }
        const videoBlob = await videoResponse.blob();
        setGeneratedVideoUrl(URL.createObjectURL(videoBlob));
      } else {
        throw new Error('Video generation finished but no video URI was returned.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      console.error("Error generating video:", err);
      if (errorMessage.includes("Requested entity was not found.")) {
        setError("API key not found or invalid. Please select a valid key.");
        resetKeySelection();
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isChecking) {
    return (
      <FeatureCard title="Video Generation" description="Generate stunning videos from text and images with Veo.">
        <div className="flex justify-center items-center h-64">
          <Spinner className="w-10 h-10 text-blue-400" />
          <p className="ml-4">Checking for API Key...</p>
        </div>
      </FeatureCard>
    );
  }
  
  if (!isKeySelected) {
    return <ApiKeyDialog onSelectKey={selectApiKey} />;
  }

  return (
    <FeatureCard title="Video Generation" description="Generate stunning videos from text and images with Veo.">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Quick Start Scenarios</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(predefinedPrompts).map(([key, value]) => (
              <button 
                key={key} 
                onClick={() => handlePromptSelection(value)}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${prompt === value ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}
              >
                {key}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-2">Prompt</label>
          <textarea id="prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} className="w-full p-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24" />
        </div>
        
        <div>
          <label htmlFor="image-upload" className="block text-sm font-medium text-gray-300 mb-2">Starting Image (Optional)</label>
          <input id="image-upload" type="file" accept="image/*" onChange={handleImageChange} className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600/20 file:text-blue-300 hover:file:bg-blue-600/30"/>
          {imagePreview && <img src={imagePreview} alt="Preview" className="mt-4 max-w-xs h-auto rounded-lg" />}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Aspect Ratio</label>
          <div className="flex gap-4">
            <button onClick={() => setAspectRatio('16:9')} className={`py-2 px-4 rounded-lg ${aspectRatio === '16:9' ? 'bg-blue-600' : 'bg-gray-700'}`}>Landscape (16:9)</button>
            <button onClick={() => setAspectRatio('9:16')} className={`py-2 px-4 rounded-lg ${aspectRatio === '9:16' ? 'bg-blue-600' : 'bg-gray-700'}`}>Portrait (9:16)</button>
          </div>
        </div>

        <button onClick={handleSubmit} disabled={isLoading || !prompt} className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg disabled:bg-gray-500 hover:bg-blue-500 transition-colors flex items-center justify-center">
          {isLoading && <Spinner className="w-5 h-5 mr-2" />}
          {isLoading ? 'Generating Video...' : 'Generate Video'}
        </button>
        
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-200 mb-2">Generated Video</h3>
          <div className="bg-gray-900/50 p-4 rounded-lg min-h-[200px] flex items-center justify-center">
            {error && <p className="text-red-400">{error}</p>}
            {isLoading && <div className="text-center"><Spinner className="w-10 h-10 text-blue-400 mx-auto"/><p className="mt-4 text-gray-300">{loadingMessage}</p></div>}
            {generatedVideoUrl && <video src={generatedVideoUrl} controls autoPlay loop className="max-w-full h-auto rounded-lg" />}
            {!isLoading && !generatedVideoUrl && !error && <p className="text-gray-500">Your generated video will appear here.</p>}
          </div>
        </div>
      </div>
    </FeatureCard>
  );
};

export default VideoGeneration;