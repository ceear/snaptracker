import { create } from 'zustand';

export const useUIStore = create((set) => ({
  activeOwner: null,
  setActiveOwner: (owner) => set({ activeOwner: owner }),

  modalImageId: null,
  modalImageIds: [],   // ordered list of IDs in the current context (e.g. gallery page)
  modalImageIndex: 0,  // position of modalImageId within modalImageIds

  openModal: (id, imageIds = [], index = 0) =>
    set({ modalImageId: id, modalImageIds: imageIds, modalImageIndex: index }),
  closeModal: () =>
    set({ modalImageId: null, modalImageIds: [], modalImageIndex: 0 }),

  modalNext: () => set((state) => {
    const next = Math.min(state.modalImageIndex + 1, state.modalImageIds.length - 1);
    return { modalImageIndex: next, modalImageId: state.modalImageIds[next] };
  }),
  modalPrev: () => set((state) => {
    const prev = Math.max(state.modalImageIndex - 1, 0);
    return { modalImageIndex: prev, modalImageId: state.modalImageIds[prev] };
  }),
}));
