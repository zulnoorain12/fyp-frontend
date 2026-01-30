import { useState, useCallback } from 'react';

/**
 * Custom hook for handling API calls with loading and error states
 * @returns {Object} { data, loading, error, callApi }
 */
export const useApi = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const callApi = useCallback(async (apiFunction, ...args) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiFunction(...args);
      setData(response.data);
      
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.response?.data?.detail || err.message || 'An error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return {
    data,
    loading,
    error,
    callApi,
    reset
  };
};

export default useApi;
