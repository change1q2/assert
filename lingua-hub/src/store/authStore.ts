import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      login: async (email: string, _password: string) => {
        // 模拟登录
        const user: User = {
          id: crypto.randomUUID(),
          email,
          name: email.split('@')[0],
        };
        set({ user, isAuthenticated: true });
      },

      register: async (email: string, _password: string, name: string) => {
        // 模拟注册
        const user: User = {
          id: crypto.randomUUID(),
          email,
          name,
        };
        set({ user, isAuthenticated: true });
      },

      logout: () => {
        set({ user: null, isAuthenticated: false });
      },

      updateUser: (updatedFields: Partial<User>) => {
        set((state) => {
          if (!state.user) return state;
          return {
            user: { ...state.user, ...updatedFields },
          };
        });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
