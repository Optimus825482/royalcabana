import { create } from "zustand";

interface SystemState {
  isOpenForReservation: boolean;
  setIsOpenForReservation: (open: boolean) => void;
}

export const useSystemStore = create<SystemState>()((set) => ({
  isOpenForReservation: true,
  setIsOpenForReservation: (open) => set({ isOpenForReservation: open }),
}));
