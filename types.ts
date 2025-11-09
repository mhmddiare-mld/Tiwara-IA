
export enum Feature {
  CHATBOT = 'Chatbot',
  IMAGE_ANALYSIS = 'Image Analysis',
  VIDEO_ANALYSIS = 'Video Analysis',
  IMAGE_GENERATION = 'Image Generation',
  VIDEO_GENERATION = 'Video Generation',
  GROUNDED_SEARCH = 'Grounded Search',
  LIVE_CONVERSATION = 'Live Conversation',
  COMPLEX_TASKS = 'Complex Tasks',
  AUDIO_TOOLS = 'Audio Tools',
  STRATEGIC_PLANNER = 'Strategic Planner',
}

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

// Keep this in sync with the keys of featureComponents in App.tsx
export const featureList: Feature[] = [
  Feature.CHATBOT,
  Feature.IMAGE_ANALYSIS,
  Feature.VIDEO_ANALYSIS,
  Feature.IMAGE_GENERATION,
  Feature.VIDEO_GENERATION,
  Feature.GROUNDED_SEARCH,
  Feature.LIVE_CONVERSATION,
  Feature.COMPLEX_TASKS,
  Feature.AUDIO_TOOLS,
  Feature.STRATEGIC_PLANNER,
];