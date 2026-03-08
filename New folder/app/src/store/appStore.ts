import { create } from 'zustand';
import type { User, DashboardData, Contact, Item, Transaction, Invoice } from '../types';

/**
 * AppState - Global application state managed by Zustand
 */
interface AppState {
  // Auth State
  currentUser: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;

  // Dashboard State
  dashboardData: DashboardData | null;
  setDashboardData: (data: DashboardData) => void;

  // Data Cache
  customers: Contact[];
  suppliers: Contact[];
  items: Item[];
  transactions: Transaction[];
  invoices: Invoice[];

  setCustomers: (customers: Contact[]) => void;
  setSuppliers: (suppliers: Contact[]) => void;
  setItems: (items: Item[]) => void;
  setTransactions: (transactions: Transaction[]) => void;
  setInvoices: (invoices: Invoice[]) => void;

  // Add single items
  addCustomer: (customer: Contact) => void;
  addSupplier: (supplier: Contact) => void;
  addItem: (item: Item) => void;
  addTransaction: (transaction: Transaction) => void;
  addInvoice: (invoice: Invoice) => void;

  // Update items
  updateCustomer: (id: number, data: Partial<Contact>) => void;
  updateSupplier: (id: number, data: Partial<Contact>) => void;
  updateItem: (id: number, data: Partial<Item>) => void;

  // Remove items
  removeCustomer: (id: number) => void;
  removeSupplier: (id: number) => void;
  removeItem: (id: number) => void;

  // Loading State
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  // Error State
  error: string | null;
  setError: (error: string | null) => void;

  // Notifications
  notification: { message: string; type: 'success' | 'error' | 'info' } | null;
  showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
  clearNotification: () => void;

  // Current Page
  currentPage: string;
  setCurrentPage: (page: string) => void;

  // Header Alert Bell
  headerAlerts: any[];
  loadHeaderAlerts: () => Promise<void>;
}

/**
 * useAppStore - Global state store for the application
 */
export const useAppStore = create<AppState>((set) => ({
  // Auth State
  currentUser: null,
  isAuthenticated: false,
  setUser: (user) => set({ currentUser: user, isAuthenticated: !!user }),
  logout: () => set({ currentUser: null, isAuthenticated: false }),

  // Dashboard State
  dashboardData: null,
  setDashboardData: (data) => set({ dashboardData: data }),

  // Data Cache
  customers: [],
  suppliers: [],
  items: [],
  transactions: [],
  invoices: [],

  setCustomers: (customers) => set({ customers }),
  setSuppliers: (suppliers) => set({ suppliers }),
  setItems: (items) => set({ items }),
  setTransactions: (transactions) => set({ transactions }),
  setInvoices: (invoices) => set({ invoices }),

  // Add single items
  addCustomer: (customer) => set((state) => ({
    customers: [...state.customers, customer]
  })),
  addSupplier: (supplier) => set((state) => ({
    suppliers: [...state.suppliers, supplier]
  })),
  addItem: (item) => set((state) => ({
    items: [...state.items, item]
  })),
  addTransaction: (transaction) => set((state) => ({
    transactions: [transaction, ...state.transactions]
  })),
  addInvoice: (invoice) => set((state) => ({
    invoices: [invoice, ...state.invoices]
  })),

  // Update items
  updateCustomer: (id, data) => set((state) => ({
    customers: state.customers.map(c => c.id === id ? { ...c, ...data } : c)
  })),
  updateSupplier: (id, data) => set((state) => ({
    suppliers: state.suppliers.map(s => s.id === id ? { ...s, ...data } : s)
  })),
  updateItem: (id, data) => set((state) => ({
    items: state.items.map(i => i.id === id ? { ...i, ...data } : i)
  })),

  // Remove items
  removeCustomer: (id) => set((state) => ({
    customers: state.customers.filter(c => c.id !== id)
  })),
  removeSupplier: (id) => set((state) => ({
    suppliers: state.suppliers.filter(s => s.id !== id)
  })),
  removeItem: (id) => set((state) => ({
    items: state.items.filter(i => i.id !== id)
  })),

  // Loading State
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),

  // Error State
  error: null,
  setError: (error) => set({ error }),

  // Notifications
  notification: null,
  showNotification: (message, type) => set({ notification: { message, type } }),
  clearNotification: () => set({ notification: null }),

  // Current Page
  currentPage: 'dashboard',
  setCurrentPage: (page) => set({ currentPage: page }),

  // Header Alert Bell
  headerAlerts: [],
  loadHeaderAlerts: async () => {
    try {
      const result = await window.electronAPI.dashboard.getNotifications();
      console.log('Frontend received notifications:', result);
      if (result.success && result.data) {
        set({ headerAlerts: result.data });
      }
    } catch (error) {
      console.error('Failed to load header alerts:', error);
    }
  },
}));
