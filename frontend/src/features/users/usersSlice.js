import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  admins: [],
  clerks: [],
  stores: [],
  loading: false,
  error: null,
};

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setAdmins: (state, action) => {
      state.admins = action.payload;
    },
    setClerks: (state, action) => {
      state.clerks = action.payload;
    },
    setStores: (state, action) => {
      state.stores = action.payload;
    },
    addClerk: (state, action) => {
      state.clerks.push(action.payload);
    },
    updateClerk: (state, action) => {
      const index = state.clerks.findIndex(clerk => clerk.id === action.payload.id);
      if (index !== -1) {
        state.clerks[index] = action.payload;
      }
    },
    removeClerk: (state, action) => {
      state.clerks = state.clerks.filter(clerk => clerk.id !== action.payload);
    },
    addAdmin: (state, action) => {
      state.admins.push(action.payload);
    },
    updateAdmin: (state, action) => {
      const index = state.admins.findIndex(admin => admin.id === action.payload.id);
      if (index !== -1) {
        state.admins[index] = action.payload;
      }
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
  setAdmins,
  setClerks,
  setStores,
  addClerk,
  updateClerk,
  removeClerk,
  addAdmin,
  updateAdmin,
  setError,
  clearError,
} = usersSlice.actions;

export default usersSlice.reducer;