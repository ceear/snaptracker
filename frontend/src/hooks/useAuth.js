import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/auth.js';
import { useUIStore } from '../store/ui.js';
import * as authApi from '@api/auth.js';

export function useAuth() {
  const { token, user, setAuth, clearAuth } = useAuthStore();
  const { setActiveOwner } = useUIStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const loginMutation = useMutation({
    mutationFn: ({ username, password }) => authApi.login(username, password),
    onSuccess: (data) => {
      // Clear stale cache from any previous user before setting new auth
      queryClient.clear();
      setActiveOwner(null);
      setAuth(data.token, data.user);
      navigate('/');
    },
    onError: (err) => {
      const msg = err.response?.data?.error || 'Login failed';
      toast.error(msg);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      queryClient.clear();
      setActiveOwner(null);
      clearAuth();
      navigate('/login');
    },
  });

  return {
    user,
    token,
    isAuthenticated: !!token,
    isAdmin: user?.role === 'admin',
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
  };
}
