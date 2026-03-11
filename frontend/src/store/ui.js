import { create } from 'zustand';

export const useUIStore = create((set) => ({
  activeOwner: null,
  setActiveOwner: (owner) => set({ activeOwner: owner }),

  modalImageId: null,
  openModal: (id) => set({ modalImageId: id }),
  closeModal: () => set({ modalImageId: null }),
}));
