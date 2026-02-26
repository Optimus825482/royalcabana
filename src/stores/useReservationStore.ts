import { create } from "zustand";

interface ReservationState {
  selectedCabanaId: string | null;
  selectedDate: string | null;
  activeReservationId: string | null;
  setSelectedCabana: (id: string | null) => void;
  setSelectedDate: (date: string | null) => void;
  setActiveReservation: (id: string | null) => void;
  reset: () => void;
}

export const useReservationStore = create<ReservationState>()((set) => ({
  selectedCabanaId: null,
  selectedDate: null,
  activeReservationId: null,
  setSelectedCabana: (id) => set({ selectedCabanaId: id }),
  setSelectedDate: (date) => set({ selectedDate: date }),
  setActiveReservation: (id) => set({ activeReservationId: id }),
  reset: () =>
    set({
      selectedCabanaId: null,
      selectedDate: null,
      activeReservationId: null,
    }),
}));
