import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerNavigationBridge } from './navigation';

// Hands the router's navigate to the navigation bridge. Renders nothing; mounted inside the
// router (src/main.tsx), above everything that may navigate from a service.
export function NavigationBridge() {
  const navigate = useNavigate();
  useEffect(() => registerNavigationBridge((to) => navigate(to)), [navigate]);
  return null;
}
