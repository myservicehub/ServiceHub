import { useState, useEffect } from 'react';
import apiClient from '../api/client';

/**
 * Custom hook to fetch Nigerian states from the backend API
 * This replaces hardcoded NIGERIAN_STATES arrays throughout the app
 */
export const useStates = () => {
  const [states, setStates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStates = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await apiClient.get('/jobs/locations/states');
        setStates(response.data.states || []);
      } catch (err) {
        console.error('Failed to fetch states:', err);
        setError(err.message || 'Failed to load states');
        
        // Fallback to hardcoded states if API fails
        const fallbackStates = [
          'Abuja',
          'Lagos', 
          'Delta',
          'Rivers State',
          'Benin',
          'Bayelsa',
          'Enugu',
          'Cross Rivers'
        ];
        setStates(fallbackStates);
      } finally {
        setLoading(false);
      }
    };

    fetchStates();
  }, []);

  return { states, loading, error };
};

export default useStates;