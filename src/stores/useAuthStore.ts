import { create } from "zustand";
import { Role } from "@/types";

interface AuthState {
  userId: string | null;
  username: string | null;
  role: Role | null;
  setUser: (user: { id: string; name: string; role: Role }) => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  userId: null,
  username: null,
  role: null,
  setUser: (user) =>
    set({ userId: user.id, username: user.name, role: user.role }),
  clearUser: () => set({ userId: null, username: null, role: null }),
}));
