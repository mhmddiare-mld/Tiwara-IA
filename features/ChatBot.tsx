
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import { FeatureCard } from '../components/FeatureCard';
import { ChatMessage } from '../types';
import { Spinner } from '../components/Icon';

const ChatBot: React.FC = () => {
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      chatRef.current = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: 'You are a helpful and friendly AI assistant. Be concise and clear in your responses.',
        },
      });
    } catch (error) {
      console.error("Failed to initialize Gemini AI:", error);
      // Handle initialization error, e.g., show an error message to the user
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading || !chatRef.current) return;

    const userMessage: ChatMessage = { role: 'user', parts: [{ text: prompt }] };
    setHistory(prev => [...prev, userMessage]);
    setIsLoading(true);
    setPrompt('');

    try {
      const result = await chatRef.current.sendMessageStream({ message: prompt });
      
      let modelResponseText = '';
      setHistory(prev => [...prev, { role: 'model', parts: [{ text: '' }] }]);

      for await (const chunk of result) {
        modelResponseText += chunk.text;
        setHistory(prev => {
          const newHistory = [...prev];
          newHistory[newHistory.length - 1] = { role: 'model', parts: [{ text: modelResponseText }] };
          return newHistory;
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setHistory(prev => [...prev, { role: 'model', parts: [{ text: `Error: ${error instanceof Error ? error.message : "An unknown error occurred"}` }] }]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fix: Use React.FC to correctly type component props and avoid issues with the 'key' prop.
  const Message: React.FC<{ message: ChatMessage }> = ({ message }) => {
    const isModel = message.role === 'model';
    return (
      <div className={`flex my-2 ${isModel ? 'justify-start' : 'justify-end'}`}>
        <div className={`p-3 rounded-lg max-w-lg ${isModel ? 'bg-gray-700' : 'bg-blue-600'} whitespace-pre-wrap`}>
          {message.parts[0].text}
        </div>
      </div>
    );
  };

  return (
    <FeatureCard title="Chatbot" description="Engage in a conversation with Gemini. History is maintained for context-aware responses.">
      <div className="flex flex-col h-[65vh]">
        <div className="flex-1 overflow-y-auto p-4 bg-gray-900/50 rounded-lg">
          {history.map((msg, index) => <Message key={index} message={msg} />)}
          {isLoading && history[history.length-1]?.role === 'user' && (
            <div className="flex justify-start my-2">
              <div className="p-3 rounded-lg bg-gray-700 flex items-center">
                <Spinner className="w-5 h-5" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSubmit} className="mt-4 flex items-center">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 p-3 bg-gray-700 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !prompt.trim()}
            className="bg-blue-600 text-white p-3 rounded-r-lg disabled:bg-gray-500 hover:bg-blue-500 transition-colors"
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </FeatureCard>
  );
};

export default ChatBot;
