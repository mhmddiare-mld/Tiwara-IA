import React, { useState, useRef, useCallback, useEffect } from 'react';
// Fix: Removed `LiveSession` as it is not an exported member of `@google/genai`.
import { GoogleGenAI, Blob, LiveServerMessage } from '@google/genai';
import { FeatureCard } from '../components/FeatureCard';
import { Spinner, MicIcon } from '../components/Icon';
import { fileToBase64, encode } from '../services/utils';

const AudioContext = window.AudioContext || (window as any).webkitAudioContext;

const ImageAnalysis: React.FC = () => {
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('What do you see in this image?');
  const [result, setResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);

  // Refs for audio processing
  // Fix: Replaced `LiveSession` with `any` since it is not an exported type.
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);


  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
      setResult('');
      setError(null);
    }
  };

  const stopRecording = useCallback(() => {
    if (sessionPromiseRef.current) {
        sessionPromiseRef.current.then(session => session.close());
        sessionPromiseRef.current = null;
    }
    if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
    }
    if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current = null;
    }
    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
        inputAudioContextRef.current.close();
    }
    setIsRecording(false);
  }, []);

  useEffect(() => {
    return () => stopRecording();
  }, [stopRecording]);

  const startRecording = async () => {
    setPrompt('');
    setError(null);
    setIsRecording(true);

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        inputAudioContextRef.current = new AudioContext({ sampleRate: 16000 });

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        sessionPromiseRef.current = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            config: { inputAudioTranscription: {} },
            callbacks: {
                onopen: () => {
                    const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
                    const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                    scriptProcessorRef.current = scriptProcessor;
                    scriptProcessor.onaudioprocess = (event) => {
                        const inputData = event.inputBuffer.getChannelData(0);
                         const pcmBlob: Blob = {
                            data: encode(new Uint8Array(new Int16Array(inputData.map(f => f * 32768)).buffer)),
                            mimeType: 'audio/pcm;rate=16000',
                        };
                        if(sessionPromiseRef.current) {
                            sessionPromiseRef.current.then(session => session.sendRealtimeInput({ media: pcmBlob }));
                        }
                    };
                    source.connect(scriptProcessor);
                    scriptProcessor.connect(inputAudioContextRef.current!.destination);
                },
                onmessage: (message: LiveServerMessage) => {
                    if (message.serverContent?.inputTranscription) {
                        setPrompt(prev => prev + message.serverContent!.inputTranscription!.text);
                    }
                },
                onerror: (e) => {
                    setError(`Transcription error: ${e.message}`);
                    stopRecording();
                },
                onclose: () => stopRecording(),
            },
        });
    } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to start recording.");
        stopRecording();
    }
  };


  const handleSubmit = async () => {
    if (!image || !prompt) {
      setError('Please upload an image and provide a prompt.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setResult('');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const base64Image = await fileToBase64(image);

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: image.type,
                data: base64Image,
              },
            },
            { text: prompt },
          ],
        },
      });

      setResult(response.text);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      console.error("Error analyzing image:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <FeatureCard title="Image Analysis" description="Upload an image and ask Gemini questions about it.">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="image-upload" className="block text-sm font-medium text-gray-300 mb-2">Upload Image</label>
          <input
            id="image-upload"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600/20 file:text-blue-300 hover:file:bg-blue-600/30"
          />
          {imagePreview && (
            <div className="mt-4">
              <img src={imagePreview} alt="Preview" className="max-w-full h-auto rounded-lg" />
            </div>
          )}
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mt-4 mb-2">Your Prompt</label>
          <div className="flex items-start gap-2">
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={isRecording ? "Listening..." : "e.g., What is in this image?"}
              className="flex-1 p-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
              disabled={isRecording}
            />
             <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isLoading}
                className={`p-3 rounded-full transition-colors ${
                    isRecording 
                    ? 'bg-red-600 hover:bg-red-500' 
                    : 'bg-blue-600 hover:bg-blue-500'
                } disabled:bg-gray-500`}
                aria-label={isRecording ? 'Stop recording' : 'Start recording'}
            >
                <MicIcon className="w-6 h-6 text-white" />
            </button>
          </div>
          <button
            onClick={handleSubmit}
            disabled={isLoading || !image}
            className="mt-4 w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-500 hover:bg-blue-500 transition-colors flex items-center justify-center"
          >
            {isLoading && <Spinner className="w-5 h-5 mr-2" />}
            {isLoading ? 'Analyzing...' : 'Analyze Image'}
          </button>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-200 mb-2">Analysis Result</h3>
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

export default ImageAnalysis;