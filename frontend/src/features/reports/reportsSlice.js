// Report state slice for dashboard charts, filters, and loading flags.
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  salesData: [],
  inventoryReports: [],
  performanceData: [],
  dateRange: {
    start: null,
    end: null,
  },
  filters: {
    store: null,
    product: null,
  },
  loading: false,
  error: null,
};

const reportsSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setSalesData: (state, action) => {
      state.salesData = action.payload;
    },
    setInventoryReports: (state, action) => {
      state.inventoryReports = action.payload;
    },
    setPerformanceData: (state, action) => {
      state.performanceData = action.payload;
    },
    setDateRange: (state, action) => {
      state.dateRange = action.payload;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = { store: null, product: null };
      state.dateRange = { start: null, end: null };
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  setLoading,
  setSalesData,
  setInventoryReports,
  setPerformanceData,
  setDateRange,
  setFilters,
  clearFilters,
  setError,
  clearError,
} = reportsSlice.actions;

export default reportsSlice.reducer;
