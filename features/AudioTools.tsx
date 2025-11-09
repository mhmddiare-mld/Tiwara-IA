
import React, { useState, useRef, useCallback, useEffect } from 'react';
// Fix: Removed `LiveSession` as it is not an exported member of `@google/genai`.
import { GoogleGenAI, Modality, Blob, LiveServerMessage } from '@google/genai';
import { FeatureCard } from '../components/FeatureCard';
import { Spinner, MicIcon } from '../components/Icon';
import { encode, decode, decodeAudioData } from '../services/utils';

const AudioContext = window.AudioContext || (window as any).webkitAudioContext;

const AudioTools: React.FC = () => {
    // --- TTS State ---
    const [textToSpeak, setTextToSpeak] = useState('Hello! I am Gemini, ready to give voice to your words.');
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [ttsError, setTtsError] = useState<string | null>(null);

    // --- Transcription State ---
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [sttError, setSttError] = useState<string | null>(null);
    // Fix: Replaced `LiveSession` with `any` since it is not an exported type.
    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);

    const handleSpeak = async () => {
        if (!textToSpeak) {
            setTtsError('Please enter text to speak.');
            return;
        }
        setIsSpeaking(true);
        setTtsError(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: textToSpeak }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
                },
            });

            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
                const outputAudioContext = new AudioContext({ sampleRate: 24000 });
                const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
                const source = outputAudioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputAudioContext.destination);
                source.start();
                source.onended = () => {
                    setIsSpeaking(false);
                    outputAudioContext.close();
                };
            } else {
                throw new Error("No audio data received from API.");
            }
        } catch (err) {
            setTtsError(err instanceof Error ? err.message : 'An unknown error occurred.');
            setIsSpeaking(false);
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
    
    // Cleanup on unmount
    useEffect(() => {
        return () => stopRecording();
    }, [stopRecording]);

    const startRecording = async () => {
        setTranscript('');
        setSttError(null);
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
                            setTranscript(prev => prev + message.serverContent!.inputTranscription!.text);
                        }
                    },
                    onerror: (e) => {
                        setSttError(`Transcription error: ${e.message}`);
                        stopRecording();
                    },
                    onclose: () => stopRecording(),
                },
            });
        } catch (err) {
            setSttError(err instanceof Error ? err.message : "Failed to start recording.");
            stopRecording();
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FeatureCard title="Text-to-Speech" description="Convert text into natural-sounding speech.">
                <div className="space-y-4">
                    <textarea value={textToSpeak} onChange={(e) => setTextToSpeak(e.target.value)} className="w-full p-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-32" />
                    <button onClick={handleSpeak} disabled={isSpeaking} className="w-full bg-purple-600 text-white font-bold py-3 px-4 rounded-lg disabled:bg-gray-500 hover:bg-purple-500 flex items-center justify-center">
                        {isSpeaking && <Spinner className="w-5 h-5 mr-2" />}
                        {isSpeaking ? 'Speaking...' : 'Generate Speech'}
                    </button>
                    {ttsError && <p className="text-red-400">{ttsError}</p>}
                </div>
            </FeatureCard>
            <FeatureCard title="Speech-to-Text" description="Transcribe your speech into text in real-time.">
                <div className="space-y-4">
                    <div className="flex justify-center">
                        <button onClick={isRecording ? stopRecording : startRecording} className={`w-24 h-24 rounded-full flex items-center justify-center transition-colors ${isRecording ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'}`}>
                            <MicIcon className="w-10 h-10 text-white" />
                        </button>
                    </div>
                     <p className="text-center text-gray-400">{isRecording ? "Recording... Click to stop." : "Click to start recording."}</p>
                    <div className="bg-gray-900/50 p-4 rounded-lg min-h-[100px] whitespace-pre-wrap">
                        {sttError && <p className="text-red-400">{sttError}</p>}
                        <p>{transcript || <span className="text-gray-500">Transcript will appear here...</span>}</p>
                    </div>
                </div>
            </FeatureCard>
        </div>
    );
};

export default AudioTools;