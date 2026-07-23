import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';

type RequireAuthProps = {
  children: ReactNode;
};

/** Gate a route behind authentication — any signed-in user may pass. */
export function RequireAuth({ children }: RequireAuthProps) {
  const { role } = useAuth();
  const location = useLocation();

  if (!role) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
