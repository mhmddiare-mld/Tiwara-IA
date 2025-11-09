
import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Feature } from './types';
import ChatBot from './features/ChatBot';
import ImageAnalysis from './features/ImageAnalysis';
import VideoAnalysis from './features/VideoAnalysis';
import ImageGeneration from './features/ImageGeneration';
import VideoGeneration from './features/VideoGeneration';
import GroundedSearch from './features/GroundedSearch';
import LiveConversation from './features/LiveConversation';
import ComplexTasks from './features/ComplexTasks';
import AudioTools from './features/AudioTools';
import StrategicPlanner from './features/StrategicPlanner';
import { GeminiIcon } from './components/Icon';

const App: React.FC = () => {
  const [activeFeature, setActiveFeature] = useState<Feature>(Feature.CHATBOT);

  const featureComponents: Record<Feature, React.ComponentType> = {
    [Feature.CHATBOT]: ChatBot,
    [Feature.IMAGE_ANALYSIS]: ImageAnalysis,
    [Feature.VIDEO_ANALYSIS]: VideoAnalysis,
    [Feature.IMAGE_GENERATION]: ImageGeneration,
    [Feature.VIDEO_GENERATION]: VideoGeneration,
    [Feature.GROUNDED_SEARCH]: GroundedSearch,
    [Feature.LIVE_CONVERSATION]: LiveConversation,
    [Feature.COMPLEX_TASKS]: ComplexTasks,
    [Feature.AUDIO_TOOLS]: AudioTools,
    [Feature.STRATEGIC_PLANNER]: StrategicPlanner,
  };

  const ActiveComponent = featureComponents[activeFeature];

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 font-sans">
      <Sidebar activeFeature={activeFeature} setActiveFeature={setActiveFeature} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 p-4 flex items-center">
           <GeminiIcon className="h-8 w-8 text-blue-400 mr-3" />
          <h1 className="text-xl font-semibold text-gray-200">Gemini AI Showcase / <span className="text-blue-400">{activeFeature}</span></h1>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {ActiveComponent ? <ActiveComponent /> : <p>Select a feature from the sidebar.</p>}
        </div>
      </main>
    </div>
  );
};

export default App;