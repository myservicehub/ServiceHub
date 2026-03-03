import { useState, useEffect } from 'react';

// Custom hook for API calls with loading and error states
export const useAPI = (apiCall, dependencies = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await apiCall();
        setData(result);
      } catch (err) {
        setError(err.response?.data?.detail || err.message || 'An error occurred');
        console.error('API Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, dependencies);

  return { data, loading, error, refetch: () => setLoading(true) };
};

// Hook for paginated API calls
export const usePaginatedAPI = (apiCall, initialParams = {}) => {
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [params, setParams] = useState({ page: 1, limit: 10, ...initialParams });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await apiCall(params);
        
        if (params.page === 1) {
          setData(result.jobs || result.tradespeople || result.reviews || []);
        } else {
          setData(prev => [...prev, ...(result.jobs || result.tradespeople || result.reviews || [])]);
        }
        
        setPagination(result.pagination);
      } catch (err) {
        setError(err.response?.data?.detail || err.message || 'An error occurred');
        console.error('API Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params]);

  const loadMore = () => {
    if (pagination && pagination.page < pagination.pages) {
      setParams(prev => ({ ...prev, page: prev.page + 1 }));
    }
  };

  const updateParams = (newParams) => {
    setParams({ ...initialParams, page: 1, ...newParams });
    setData([]);
  };

  return { 
    data, 
    pagination, 
    loading, 
    error, 
    loadMore, 
    updateParams,
    hasMore: pagination ? pagination.page < pagination.pages : false
  };
};