'use client';

import { useStoreInitialization } from '@/lib/stores';

/**
 * Store provider component that initializes all stores and their WebSocket synchronization
 * This component should be used at the app level to ensure stores are properly initialized
 */
export function StoreProvider({ children }: { children: React.ReactNode }) {
  // Initialize all stores and their WebSocket synchronization
  useStoreInitialization();

  return <>{children}</>;
}