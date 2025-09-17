import { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';

/**
 * Custom hook to fetch Nigerian states, LGAs, and towns from the backend API
 * This replaces hardcoded NIGERIAN_STATES arrays throughout the app
 */
export const useStates = () => {
  const [states, setStates] = useState([]);
  const [lgas, setLgas] = useState([]);
  const [towns, setTowns] = useState([]);
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

  const loadLGAs = async (state) => {
    try {
      setLgas([]); // Clear previous LGAs
      if (!state) return;
      
      const response = await apiClient.get(`/auth/lgas/${encodeURIComponent(state)}`);
      setLgas(response.data.lgas || []);
    } catch (err) {
      console.error('Failed to fetch LGAs:', err);
      setLgas([]); // Set empty array on error
    }
  };

  const loadTowns = async (state, lga) => {
    try {
      setTowns([]); // Clear previous towns
      if (!state || !lga) return;
      
      // For now, return sample towns since the towns API might not be fully implemented
      // This can be updated when the backend towns API is available
      const sampleTowns = [
        'Central Area',
        'Victoria Island',
        'Ikeja',
        'Lekki',
        'Surulere',
        'Yaba'
      ];
      setTowns(sampleTowns);
    } catch (err) {
      console.error('Failed to fetch towns:', err);
      setTowns([]); // Set empty array on error
    }
  };

  return { 
    states: states || [], 
    lgas: lgas || [], 
    towns: towns || [], 
    loading, 
    error, 
    loadLGAs, 
    loadTowns 
  };
};

export default useStates;