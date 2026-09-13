import { create } from "zustand";

interface UiState {
  selectedEntryId: string | null;
  pendingConfirmIds: string[];
  openEntry: (id: string) => void;
  closeEntry: () => void;
  setPendingConfirmIds: (ids: string[]) => void;
  advancePendingConfirm: () => void;
  clearPendingConfirm: () => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  selectedEntryId: null,
  pendingConfirmIds: [],
  openEntry: (id) => set({ selectedEntryId: id }),
  closeEntry: () => set({ selectedEntryId: null }),
  setPendingConfirmIds: (ids) => set({ pendingConfirmIds: ids }),
  advancePendingConfirm: () => {
    const rest = get().pendingConfirmIds.slice(1);
    set({ pendingConfirmIds: rest });
  },
  clearPendingConfirm: () => set({ pendingConfirmIds: [] }),
}));
