
import { useState, useEffect, useCallback } from 'react';

// Mock window.aistudio for environments where it might not exist
if (typeof window !== 'undefined' && !(window as any).aistudio) {
  (window as any).aistudio = {
    // Fix: Added explicit type arguments to Promise constructor.
    hasSelectedApiKey: () => new Promise<boolean>(resolve => resolve(false)),
    openSelectKey: () => new Promise<void>(resolve => resolve()),
  };
}

export const useVeoApiKey = () => {
  const [isKeySelected, setIsKeySelected] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const checkApiKey = useCallback(async () => {
    setIsChecking(true);
    try {
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      setIsKeySelected(hasKey);
    } catch (error) {
      console.error("Error checking for API key:", error);
      setIsKeySelected(false);
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    checkApiKey();
  }, [checkApiKey]);

  const selectApiKey = useCallback(async () => {
    try {
      await (window as any).aistudio.openSelectKey();
      // Assume success to avoid race conditions and provide immediate UI feedback.
      setIsKeySelected(true);
    } catch (error) {
      console.error("Error opening API key selection:", error);
      setIsKeySelected(false);
    }
  }, []);
  
  const resetKeySelection = useCallback(() => {
      setIsKeySelected(false);
  }, []);

  return { isKeySelected, isChecking, selectApiKey, resetKeySelection };
};
