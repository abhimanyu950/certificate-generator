import { create } from 'zustand';

export interface Recipient {
  id: string | number;
  name: string;
  email: string;
  course?: string;
  status: 'pending' | 'sent' | 'failed';
  certId: string | null;
  error: string | null;
}

interface RecipientState {
  recipients: Recipient[];
  selectedIds: (string | number)[];
  searchQuery: string;
  orgFilter: string;
  statusFilter: string;
  
  setRecipients: (recipients: Recipient[]) => void;
  addRecipient: (name: string, email: string, course?: string) => void;
  updateRecipient: (id: string | number, updates: Partial<Recipient>) => void;
  deleteRecipient: (id: string | number) => void;
  clearRecipients: () => void;
  importCSV: (csvText: string) => void;
  
  // Selection
  toggleSelect: (id: string | number) => void;
  selectAll: (checked: boolean) => void;
  clearSelection: () => void;
  
  // Filtering
  setSearchQuery: (query: string) => void;
  setStatusFilter: (filter: string) => void;
}

export const useRecipientStore = create<RecipientState>((set) => {
  // Load initially from local storage
  const loadLocalRecipients = (): Recipient[] => {
    try {
      const data = localStorage.getItem('cf_recipients');
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn('Failed to load local recipients:', e);
    }
    return [];
  };

  const saveLocalRecipients = (list: Recipient[]) => {
    localStorage.setItem('cf_recipients', JSON.stringify(list));
  };

  return {
    recipients: loadLocalRecipients(),
    selectedIds: [],
    searchQuery: '',
    orgFilter: 'All',
    statusFilter: 'All',

    setRecipients: (recipients) => {
      set({ recipients });
      saveLocalRecipients(recipients);
    },

    addRecipient: (name, email, course = '') => {
      const newRec: Recipient = {
        id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name,
        email,
        course,
        status: 'pending',
        certId: null,
        error: null
      };
      set((state) => {
        const next = [...state.recipients, newRec];
        saveLocalRecipients(next);
        return { recipients: next };
      });
    },

    updateRecipient: (id, updates) => {
      set((state) => {
        const next = state.recipients.map((r) => (r.id === id ? { ...r, ...updates } : r));
        saveLocalRecipients(next);
        return { recipients: next };
      });
    },

    deleteRecipient: (id) => {
      set((state) => {
        const next = state.recipients.filter((r) => r.id !== id);
        saveLocalRecipients(next);
        return {
          recipients: next,
          selectedIds: state.selectedIds.filter((sId) => sId !== id)
        };
      });
    },

    clearRecipients: () => {
      set({ recipients: [], selectedIds: [] });
      saveLocalRecipients([]);
    },

    importCSV: (csvText) => {
      const lines = csvText.split('\n').filter((l) => l.trim());
      const nextRecs: Recipient[] = [];
      
      lines.slice(1).forEach((line) => {
        const parts = line.split(',').map((s) => s.trim().replace(/^"|"$/g, ''));
        const [name, email, course] = parts;
        if (name && email) {
          nextRecs.push({
            id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}_${nextRecs.length}`,
            name,
            email,
            course: course || '',
            status: 'pending',
            certId: null,
            error: null
          });
        }
      });

      set((state) => {
        const next = [...state.recipients, ...nextRecs];
        saveLocalRecipients(next);
        return { recipients: next };
      });
    },

    toggleSelect: (id) => {
      set((state) => {
        const exists = state.selectedIds.includes(id);
        const next = exists
          ? state.selectedIds.filter((sId) => sId !== id)
          : [...state.selectedIds, id];
        return { selectedIds: next };
      });
    },

    selectAll: (checked) => {
      set((state) => {
        const next = checked ? state.recipients.map((r) => r.id) : [];
        return { selectedIds: next };
      });
    },

    clearSelection: () => set({ selectedIds: [] }),

    setSearchQuery: (query) => set({ searchQuery: query }),
    setStatusFilter: (filter) => set({ statusFilter: filter }),
  };
});
