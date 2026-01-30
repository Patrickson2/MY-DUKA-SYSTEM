import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  products: [],
  inventory: [],
  supplyRequests: [],
  loading: false,
  error: null,
};

const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setProducts: (state, action) => {
      state.products = action.payload;
    },
    setInventory: (state, action) => {
      state.inventory = action.payload;
    },
    setSupplyRequests: (state, action) => {
      state.supplyRequests = action.payload;
    },
    updateSupplyRequest: (state, action) => {
      const index = state.supplyRequests.findIndex(req => req.id === action.payload.id);
      if (index !== -1) {
        state.supplyRequests[index] = action.payload;
      }
    },
    addProduct: (state, action) => {
      state.products.push(action.payload);
    },
    updateProduct: (state, action) => {
      const index = state.products.findIndex(product => product.id === action.payload.id);
      if (index !== -1) {
        state.products[index] = action.payload;
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
  setProducts,
  setInventory,
  setSupplyRequests,
  updateSupplyRequest,
  addProduct,
  updateProduct,
  setError,
  clearError,
} = inventorySlice.actions;

export default inventorySlice.reducer;