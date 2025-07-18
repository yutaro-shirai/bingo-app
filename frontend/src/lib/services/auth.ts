import { z } from 'zod';

// Authentication types
export interface AdminUser {
  id: string;
  username: string;
  isAdmin: boolean;
}

export const LoginCredentialsSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type LoginCredentials = z.infer<typeof LoginCredentialsSchema>;

export interface LoginResponse {
  user: AdminUser;
  token: string;
}

export interface AuthState {
  user: AdminUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Authentication service for admin users
 */
export class AuthService {
  private static readonly TOKEN_KEY = 'bingo_admin_token';
  private static readonly USER_KEY = 'bingo_admin_user';
  
  /**
   * Login with username and password
   * @param credentials Login credentials
   * @returns Login response with user and token
   */
  public async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      // Validate credentials
      LoginCredentialsSchema.parse(credentials);
      
      // Call the backend auth API
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
        credentials: 'include', // Include cookies for CORS
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }
      
      const data = await response.json();
      
      // Store authentication data
      this.setToken(data.token);
      this.setUser(data.user);
      
      return data;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(error.errors[0].message);
      }
      throw error;
    }
  }
  
  /**
   * Logout the current user
   */
  public logout(): void {
    this.removeToken();
    this.removeUser();
  }
  
  /**
   * Check if the user is authenticated
   * @returns True if authenticated
   */
  public isAuthenticated(): boolean {
    return !!this.getToken() && !!this.getUser();
  }
  
  /**
   * Get the current user
   * @returns The current user or null
   */
  public getUser(): AdminUser | null {
    if (typeof window === 'undefined') {
      return null;
    }
    
    const userJson = localStorage.getItem(AuthService.USER_KEY);
    if (!userJson) {
      return null;
    }
    
    try {
      return JSON.parse(userJson);
    } catch {
      return null;
    }
  }
  
  /**
   * Get the authentication token
   * @returns The token or null
   */
  public getToken(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }
    
    return localStorage.getItem(AuthService.TOKEN_KEY);
  }
  
  /**
   * Set the authentication token
   * @param token The token to set
   */
  private setToken(token: string): void {
    if (typeof window === 'undefined') {
      return;
    }
    
    localStorage.setItem(AuthService.TOKEN_KEY, token);
  }
  
  /**
   * Set the current user
   * @param user The user to set
   */
  private setUser(user: AdminUser): void {
    if (typeof window === 'undefined') {
      return;
    }
    
    localStorage.setItem(AuthService.USER_KEY, JSON.stringify(user));
  }
  
  /**
   * Remove the authentication token
   */
  private removeToken(): void {
    if (typeof window === 'undefined') {
      return;
    }
    
    localStorage.removeItem(AuthService.TOKEN_KEY);
  }
  
  /**
   * Remove the current user
   */
  private removeUser(): void {
    if (typeof window === 'undefined') {
      return;
    }
    
    localStorage.removeItem(AuthService.USER_KEY);
  }
}

// Create a singleton instance
let authService: AuthService | null = null;

/**
 * Get the authentication service instance
 * @returns The authentication service instance
 */
export const getAuthService = (): AuthService => {
  if (!authService) {
    authService = new AuthService();
  }
  return authService;
};