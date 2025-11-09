
import React, { useState, useEffect } from 'react';
import { GoogleGenAI, GroundingChunk } from '@google/genai';
import { FeatureCard } from '../components/FeatureCard';
import { Spinner } from '../components/Icon';

type SearchType = 'web' | 'maps';

const GroundedSearch: React.FC = () => {
  const [query, setQuery] = useState<string>("Who won the most bronze medals in the Paris Olympics 2024?");
  const [searchType, setSearchType] = useState<SearchType>('web');
  const [result, setResult] = useState<string>('');
  const [chunks, setChunks] = useState<GroundingChunk[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{latitude: number; longitude: number} | null>(null);

  useEffect(() => {
    if (searchType === 'maps') {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (err) => {
          console.warn(`Could not get geolocation: ${err.message}`);
          setError("Could not get your location for Maps search. Please enable location services.");
        }
      );
    }
  }, [searchType]);

  const handleSearchTypeChange = (type: SearchType) => {
      setSearchType(type);
      setResult('');
      setChunks([]);
      setError(null);
      if (type === 'web') {
          setQuery("Who won the most bronze medals in the Paris Olympics 2024?");
      } else {
          setQuery("What good Italian restaurants are nearby?");
      }
  };

  const handleSubmit = async () => {
    if (!query) {
      setError('Please enter a query.');
      return;
    }
    if (searchType === 'maps' && !userLocation) {
      setError('Location is required for Maps search. Please allow location access.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult('');
    setChunks([]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      
      const tools = searchType === 'web' ? [{ googleSearch: {} }] : [{ googleMaps: {} }];
      const toolConfig = searchType === 'maps' && userLocation ? { retrievalConfig: { latLng: userLocation } } : {};

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: query,
        config: {
          tools,
          ...(searchType === 'maps' && { toolConfig })
        },
      });

      setResult(response.text);
      if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        setChunks(response.candidates[0].groundingMetadata.groundingChunks);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      console.error("Error with grounded search:", err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fix: Use React.FC to correctly type component props and avoid issues with the 'key' prop.
  const GroundingChunkDisplay: React.FC<{ chunk: GroundingChunk }> = ({ chunk }) => {
    if (chunk.web) {
        return <a href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="block bg-gray-700 p-2 rounded-lg text-blue-300 hover:bg-gray-600 transition-colors">{chunk.web.title || chunk.web.uri}</a>
    }
    if (chunk.maps) {
        return <a href={chunk.maps.uri} target="_blank" rel="noopener noreferrer" className="block bg-gray-700 p-2 rounded-lg text-blue-300 hover:bg-gray-600 transition-colors">{chunk.maps.title || chunk.maps.uri}</a>
    }
    return null;
  }

  return (
    <FeatureCard title="Grounded Search" description="Get up-to-date, real-world information by grounding Gemini's responses in Google Search or Maps.">
      <div className="space-y-4">
        <div className="flex gap-4">
            <button onClick={() => handleSearchTypeChange('web')} className={`py-2 px-4 rounded-lg ${searchType === 'web' ? 'bg-blue-600' : 'bg-gray-700'}`}>Web Search</button>
            <button onClick={() => handleSearchTypeChange('maps')} className={`py-2 px-4 rounded-lg ${searchType === 'maps' ? 'bg-blue-600' : 'bg-gray-700'}`}>Maps Search</button>
        </div>
        
        <div>
          <label htmlFor="query" className="block text-sm font-medium text-gray-300 mb-2">Your Query</label>
          <textarea id="query" value={query} onChange={(e) => setQuery(e.target.value)} className="w-full p-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24" />
        </div>
        
        <button onClick={handleSubmit} disabled={isLoading || !query} className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg disabled:bg-gray-500 hover:bg-blue-500 transition-colors flex items-center justify-center">
          {isLoading && <Spinner className="w-5 h-5 mr-2" />}
          {isLoading ? 'Searching...' : 'Search'}
        </button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="md:col-span-2">
                <h3 className="text-lg font-semibold text-gray-200 mb-2">Response</h3>
                <div className="bg-gray-900/50 p-4 rounded-lg min-h-[150px] whitespace-pre-wrap">
                    {error && <p className="text-red-400">{error}</p>}
                    {result && <p>{result}</p>}
                    {!error && !result && <p className="text-gray-500">Search results will appear here.</p>}
                </div>
            </div>
            <div>
                 <h3 className="text-lg font-semibold text-gray-200 mb-2">Sources</h3>
                 <div className="bg-gray-900/50 p-4 rounded-lg min-h-[150px] space-y-2">
                    {chunks.length > 0 ? chunks.map((chunk, i) => <GroundingChunkDisplay key={i} chunk={chunk} />) : <p className="text-gray-500">Source links will appear here.</p>}
                 </div>
            </div>
        </div>
      </div>
    </FeatureCard>
  );
};

export default GroundedSearch;
