
import React from 'react';
import { Feature, featureList } from '../types';
// Fix: Removed CodeIcon as it is not exported from './Icon' and not used.
import { ChatIcon, ImageIcon, SearchIcon, VideoIcon, MicIcon, WandIcon, AudioWaveIcon, BrainCircuitIcon, MapIcon } from './Icon';

interface SidebarProps {
  activeFeature: Feature;
  setActiveFeature: (feature: Feature) => void;
}

const featureIcons: Record<Feature, React.ReactNode> = {
  [Feature.CHATBOT]: <ChatIcon className="h-5 w-5" />,
  [Feature.IMAGE_ANALYSIS]: <ImageIcon className="h-5 w-5" />,
  [Feature.VIDEO_ANALYSIS]: <VideoIcon className="h-5 w-5" />,
  [Feature.IMAGE_GENERATION]: <WandIcon className="h-5 w-5" />,
  [Feature.VIDEO_GENERATION]: <VideoIcon className="h-5 w-5" />,
  [Feature.GROUNDED_SEARCH]: <SearchIcon className="h-5 w-5" />,
  [Feature.LIVE_CONVERSATION]: <MicIcon className="h-5 w-5" />,
  [Feature.COMPLEX_TASKS]: <BrainCircuitIcon className="h-5 w-5" />,
  [Feature.AUDIO_TOOLS]: <AudioWaveIcon className="h-5 w-5" />,
  [Feature.STRATEGIC_PLANNER]: <MapIcon className="h-5 w-5" />,
};

export const Sidebar: React.FC<SidebarProps> = ({ activeFeature, setActiveFeature }) => {
  return (
    <nav className="w-64 bg-gray-900/70 backdrop-blur-lg border-r border-gray-800 flex flex-col p-4 space-y-2">
      <div className="flex items-center space-x-2 p-2 mb-4">
        <img src="https://www.gstatic.com/a/google_brand_color_1x/v1/gemini_color_1x.png" alt="Gemini Logo" className="h-8 w-8" />
        <span className="text-2xl font-bold text-white">Showcase</span>
      </div>
      {featureList.map((feature) => (
        <button
          key={feature}
          onClick={() => setActiveFeature(feature)}
          className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ease-in-out
            ${
              activeFeature === feature
                ? 'bg-blue-600/20 text-blue-300'
                : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'
            }`}
        >
          {featureIcons[feature]}
          <span>{feature}</span>
        </button>
      ))}
    </nav>
  );
};