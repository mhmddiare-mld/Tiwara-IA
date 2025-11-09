
import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { FeatureCard } from '../components/FeatureCard';
import { Spinner } from '../components/Icon';

const predefinedTasks = {
    'logistics': 'Create an optimized transportation and logistics plan for distributing perishable goods from a central warehouse to 5 city supermarkets, minimizing travel time and fuel costs. Consider traffic patterns and delivery windows.',
    'economics': 'Analyze mock social and economic data for a fictional city to identify neighborhoods at high risk for unemployment. Propose three data-driven, preventative interventions.',
    'agriculture': 'Using predictive climate models that suggest a 15% decrease in rainfall over the next decade, recommend optimal agricultural practices and crop choices for the central valley region of California.',
};

type TaskKey = keyof typeof predefinedTasks;

const ComplexTasks: React.FC = () => {
    const [prompt, setPrompt] = useState<string>(predefinedTasks.logistics);
    const [result, setResult] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const handleTaskChange = (key: TaskKey) => {
        setPrompt(predefinedTasks[key]);
        setResult('');
        setError(null);
    }
    
    const handleSubmit = async () => {
        if (!prompt) {
            setError('Please provide a prompt for the complex task.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setResult('');

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: prompt,
                config: {
                    thinkingConfig: { thinkingBudget: 32768 }
                }
            });

            setResult(response.text);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(errorMessage);
            console.error("Error with complex task:", err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <FeatureCard title="Complex Tasks with Thinking Mode" description="Challenge Gemini 2.5 Pro with complex problems. 'Thinking Mode' allows for more in-depth reasoning to generate comprehensive solutions.">
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Select a Predefined Task</label>
                    <div className="flex flex-wrap gap-2">
                        {Object.keys(predefinedTasks).map(key => (
                            <button key={key} onClick={() => handleTaskChange(key as TaskKey)} className="capitalize px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-full text-sm">{key}</button>
                        ))}
                    </div>
                </div>
                <div>
                    <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-2">Your Complex Prompt</label>
                    <textarea
                        id="prompt"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="w-full p-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-40"
                    />
                </div>
                
                <button
                    onClick={handleSubmit}
                    disabled={isLoading || !prompt}
                    className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg disabled:bg-gray-500 hover:bg-blue-500 transition-colors flex items-center justify-center"
                >
                    {isLoading && <Spinner className="w-5 h-5 mr-2" />}
                    {isLoading ? 'Thinking...' : 'Execute with Thinking Mode'}
                </button>

                <div>
                    <h3 className="text-lg font-semibold text-gray-200 mb-2 mt-4">Result</h3>
                    <div className="bg-gray-900/50 p-4 rounded-lg min-h-[200px] whitespace-pre-wrap">
                        {error && <p className="text-red-400">{error}</p>}
                        {isLoading && <div className="flex justify-center items-center h-full"><Spinner className="w-8 h-8 text-blue-400" /></div>}
                        {result && <p>{result}</p>}
                        {!error && !result && !isLoading && <p className="text-gray-500">The detailed solution will appear here.</p>}
                    </div>
                </div>
            </div>
        </FeatureCard>
    );
};

export default ComplexTasks;
