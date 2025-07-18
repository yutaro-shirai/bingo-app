'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/services';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

/**
 * Component to protect routes that require authentication
 */
export function ProtectedRoute({ children, adminOnly = true }: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading, isAdmin } = useAuth();

  useEffect(() => {
    // Wait until auth state is loaded
    if (isLoading) {
      return;
    }
    
    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      router.push('/admin/login');
      return;
    }
    
    // Redirect to home if admin-only and not admin
    if (adminOnly && !isAdmin()) {
      router.push('/');
      return;
    }
  }, [isAuthenticated, isLoading, adminOnly, isAdmin, router]);

  // Show nothing while loading or redirecting
  if (isLoading || !isAuthenticated || (adminOnly && !isAdmin())) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Render children if authenticated and authorized
  return <>{children}</>;
}