
import React, { useState, useRef, useCallback, useEffect } from 'react';
// Fix: Removed `LiveSession` as it is not an exported member of `@google/genai`.
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { FeatureCard } from '../components/FeatureCard';
import { encode, decode, decodeAudioData } from '../services/utils';

// Polyfill for webkitAudioContext
const AudioContext = window.AudioContext || (window as any).webkitAudioContext;

const LiveConversation: React.FC = () => {
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [transcriptionHistory, setTranscriptionHistory] = useState<{user: string; model: string}[]>([]);
    const [currentTranscription, setCurrentTranscription] = useState({ user: '', model: '' });
    const [error, setError] = useState<string | null>(null);

    // Fix: Replaced `LiveSession` with `any` since it is not an exported type.
    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

    const stopSession = useCallback(() => {
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
            inputAudioContextRef.current = null;
        }

        if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
            outputAudioContextRef.current.close();
            outputAudioContextRef.current = null;
        }

        audioSourcesRef.current.forEach(source => source.stop());
        audioSourcesRef.current.clear();
        nextStartTimeRef.current = 0;
        
        setIsSessionActive(false);
    }, []);
    
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopSession();
        };
    }, [stopSession]);


    const startSession = async () => {
        if (isSessionActive) return;

        setError(null);
        setTranscriptionHistory([]);
        setCurrentTranscription({ user: '', model: '' });

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            inputAudioContextRef.current = new AudioContext({ sampleRate: 16000 });
            outputAudioContextRef.current = new AudioContext({ sampleRate: 24000 });

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
                    systemInstruction: 'You are a friendly and helpful AI assistant.',
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                },
                callbacks: {
                    onopen: () => {
                        setIsSessionActive(true);
                        const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
                        const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = scriptProcessor;

                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob: Blob = {
                                data: encode(new Uint8Array(new Int16Array(inputData.map(f => f * 32768)).buffer)),
                                mimeType: 'audio/pcm;rate=16000',
                            };
                            if (sessionPromiseRef.current) {
                                sessionPromiseRef.current.then((session) => {
                                    session.sendRealtimeInput({ media: pcmBlob });
                                });
                            }
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContextRef.current!.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        if (message.serverContent) {
                            if (message.serverContent.inputTranscription) {
                                setCurrentTranscription(prev => ({...prev, user: prev.user + message.serverContent!.inputTranscription!.text}));
                            }
                            if (message.serverContent.outputTranscription) {
                                setCurrentTranscription(prev => ({...prev, model: prev.model + message.serverContent!.outputTranscription!.text}));
                            }
                            if (message.serverContent.turnComplete) {
                                setTranscriptionHistory(prev => [...prev, currentTranscription]);
                                setCurrentTranscription({user: '', model: ''});
                            }
                            const audioData = message.serverContent.modelTurn?.parts[0]?.inlineData.data;
                            if (audioData) {
                                const audioContext = outputAudioContextRef.current!;
                                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioContext.currentTime);
                                const audioBuffer = await decodeAudioData(decode(audioData), audioContext, 24000, 1);
                                const source = audioContext.createBufferSource();
                                source.buffer = audioBuffer;
                                source.connect(audioContext.destination);
                                source.start(nextStartTimeRef.current);
                                nextStartTimeRef.current += audioBuffer.duration;
                                audioSourcesRef.current.add(source);
                                source.onended = () => audioSourcesRef.current.delete(source);
                            }
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error("Live session error:", e);
                        setError(`Session error: ${e.message}`);
                        stopSession();
                    },
                    onclose: () => {
                        stopSession();
                    },
                },
            });
        } catch (err) {
            console.error("Failed to start session:", err);
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
            stopSession();
        }
    };

    return (
        <FeatureCard title="Live Conversation" description="Speak directly with Gemini and receive real-time audio responses and transcriptions.">
            <div className="flex flex-col items-center space-y-4">
                <button
                    onClick={isSessionActive ? stopSession : startSession}
                    className={`px-8 py-4 text-lg font-bold rounded-full transition-all duration-300 transform hover:scale-105 ${
                        isSessionActive 
                        ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/30'
                        : 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-500/30'
                    }`}
                >
                    {isSessionActive ? 'Stop Conversation' : 'Start Conversation'}
                </button>
                {error && <p className="text-red-400">Error: {error}</p>}
                <div className="w-full bg-gray-900/50 p-4 rounded-lg mt-4 h-96 overflow-y-auto">
                    <h3 className="text-lg font-semibold mb-2">Transcription</h3>
                    {transcriptionHistory.map((turn, index) => (
                        <div key={index} className="mb-4">
                            <p><strong className="text-blue-400">You:</strong> {turn.user}</p>
                            <p><strong className="text-purple-400">Gemini:</strong> {turn.model}</p>
                        </div>
                    ))}
                    {isSessionActive && (
                         <div className="mb-4 opacity-70">
                            {currentTranscription.user && <p><strong className="text-blue-400">You:</strong> {currentTranscription.user}</p>}
                            {currentTranscription.model && <p><strong className="text-purple-400">Gemini:</strong> {currentTranscription.model}</p>}
                        </div>
                    )}
                </div>
            </div>
        </FeatureCard>
    );
};

export default LiveConversation;