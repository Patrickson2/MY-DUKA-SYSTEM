import { configureStore } from '@reduxjs/toolkit';
import authSlice from '../features/auth/authSlice';
import inventorySlice from '../features/inventory/inventorySlice';
import reportsSlice from '../features/reports/reportsSlice';
import usersSlice from '../features/users/usersSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    inventory: inventorySlice,
    reports: reportsSlice,
    users: usersSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});