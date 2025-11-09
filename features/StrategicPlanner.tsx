import React, { useState, useEffect } from 'react';
import { GoogleGenAI, GroundingChunk } from '@google/genai';
import { FeatureCard } from '../components/FeatureCard';
import { Spinner } from '../components/Icon';

const predefinedTasks = {
    maliLogistics: "Using data from Mali's Ministry of Transport on road infrastructure and agricultural data from the Ministry of Agriculture, create an optimized logistics plan for distributing cotton from production zones around Sikasso to the main export hub in Bamako. The plan should minimize transport costs and account for seasonal road conditions. Use my current location as a starting reference point for Bamako.",
    maliHealth: "As a consultant for Mali's Ministry of Health, analyze the following hypothetical data: 'Malaria incidence is 30% higher in the Mopti region during the rainy season, while access to clinics is 50% lower than the national average.' Propose three targeted public health interventions, detailing awareness campaigns and resource allocation strategies.",
    maliAgriFood: "As a consultant for a food packaging company entering the Malian market, analyze the agri-food sector (focusing on mangoes and shea nuts) using data types from the Ministry of Agriculture and INSTAT. Propose three sustainable packaging solutions that improve shelf life for both local distribution and export, meeting international quality standards.",
    maliSolarEnergy: "Acting as an advisor to the Malian Agency for Solar Energy (AMES), develop a strategic plan to increase solar energy's contribution to the national grid. Based on data from the Ministry of Energy and EDM, outline three flagship projects, estimate investment needs, and propose policies to boost rural electricity access.",
};


type TaskKey = keyof typeof predefinedTasks;

const StrategicPlanner: React.FC = () => {
    const [selectedTask, setSelectedTask] = useState<TaskKey>('maliLogistics');
    const [prompt, setPrompt] = useState<string>(predefinedTasks.maliLogistics);
    const [result, setResult] = useState<string>('');
    const [chunks, setChunks] = useState<GroundingChunk[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [userLocation, setUserLocation] = useState<{latitude: number; longitude: number} | null>(null);

    // Get location for logistics task
    useEffect(() => {
        if (selectedTask === 'maliLogistics') {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    });
                },
                (err) => {
                    console.warn(`Could not get geolocation: ${err.message}`);
                    setError("Could not get your location for the Logistics task. Please enable location services.");
                }
            );
        }
    }, [selectedTask]);

    const handleTaskChange = (key: TaskKey) => {
        setSelectedTask(key);
        setPrompt(predefinedTasks[key]);
        setResult('');
        setChunks([]);
        setError(null);
    }

    const handleSubmit = async () => {
        if (!prompt) {
            setError('Please provide a prompt for the task.');
            return;
        }
        if (selectedTask === 'maliLogistics' && !userLocation) {
            setError('Location is required for the Logistics task. Please allow location access.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setResult('');
        setChunks([]);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            
            let config: any = {};
            if (selectedTask === 'maliLogistics') {
                config.tools = [{ googleMaps: {} }];
                if (userLocation) {
                    config.toolConfig = { retrievalConfig: { latLng: userLocation } };
                }
            } else {
                config.thinkingConfig = { thinkingBudget: 32768 };
            }

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: prompt,
                config: config,
            });

            setResult(response.text);
            if (selectedTask === 'maliLogistics' && response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
                setChunks(response.candidates[0].groundingMetadata.groundingChunks);
            }

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(errorMessage);
            console.error("Error with strategic planner:", err);
        } finally {
            setIsLoading(false);
        }
    };
    
    const GroundingChunkDisplay: React.FC<{ chunk: GroundingChunk }> = ({ chunk }) => {
        if (chunk.maps) {
            return <a href={chunk.maps.uri} target="_blank" rel="noopener noreferrer" className="block bg-gray-700 p-2 rounded-lg text-blue-300 hover:bg-gray-600 transition-colors">{chunk.maps.title || chunk.maps.uri}</a>
        }
        return null;
    }

    return (
        <FeatureCard title="Strategic Planner" description="Leverage Gemini for strategic planning tailored to Mali's context, using simulated scenarios based on data from its ministries.">
            <div className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Select a Planning Scenario for Mali</label>
                    <div className="flex flex-wrap gap-2">
                        {Object.keys(predefinedTasks).map((key) => (
                            <button 
                                key={key} 
                                onClick={() => handleTaskChange(key as TaskKey)} 
                                className={`capitalize px-3 py-1.5 rounded-full text-sm transition-colors ${selectedTask === key ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}
                            >
                                {key.replace('mali', '').replace(/([A-Z])/g, ' $1').trim()}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-2">Planning Prompt</label>
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
                    {isLoading ? 'Generating Plan...' : 'Generate Plan'}
                </button>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                    <div className="md:col-span-2">
                        <h3 className="text-lg font-semibold text-gray-200 mb-2">Generated Plan / Analysis</h3>
                        <div className="bg-gray-900/50 p-4 rounded-lg min-h-[200px] whitespace-pre-wrap">
                            {error && <p className="text-red-400">{error}</p>}
                            {isLoading && <div className="flex justify-center items-center h-full"><Spinner className="w-8 h-8 text-blue-400" /></div>}
                            {result && <p>{result}</p>}
                            {!error && !result && !isLoading && <p className="text-gray-500">The generated plan will appear here.</p>}
                        </div>
                    </div>
                    <div>
                         <h3 className="text-lg font-semibold text-gray-200 mb-2">Sources</h3>
                         <div className="bg-gray-900/50 p-4 rounded-lg min-h-[200px] space-y-2">
                            {chunks.length > 0 
                                ? chunks.map((chunk, i) => <GroundingChunkDisplay key={i} chunk={chunk} />) 
                                : <p className="text-gray-500">{selectedTask === 'maliLogistics' ? 'Map links will appear here.' : 'No sources for this task.'}</p>}
                         </div>
                    </div>
                </div>
            </div>
        </FeatureCard>
    );
};

export default StrategicPlanner;