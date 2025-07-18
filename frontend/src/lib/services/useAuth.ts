import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthService, LoginCredentials, AdminUser, AuthState } from './auth';

/**
 * Hook for using the authentication service in React components
 */
export const useAuth = () => {
  const auth = getAuthService();
  const router = useRouter();
  
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });
  
  // Initialize auth state from localStorage
  useEffect(() => {
    const user = auth.getUser();
    const token = auth.getToken();
    const isAuthenticated = auth.isAuthenticated();
    
    setState({
      user,
      token,
      isAuthenticated,
      isLoading: false,
      error: null,
    });
  }, [auth]);
  
  /**
   * Login with username and password
   * @param credentials Login credentials
   */
  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const response = await auth.login(credentials);
      
      setState({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      
      return response;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Login failed',
      }));
      throw error;
    }
  }, [auth]);
  
  /**
   * Logout the current user
   */
  const logout = useCallback(() => {
    auth.logout();
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
    router.push('/admin/login');
  }, [auth, router]);
  
  /**
   * Check if the user has admin privileges
   */
  const isAdmin = useCallback(() => {
    return state.user?.isAdmin === true;
  }, [state.user]);
  
  return {
    ...state,
    login,
    logout,
    isAdmin,
  };
};