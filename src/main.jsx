import React from 'react';
import { createRoot } from 'react-dom/client';
import CustomEase from './CustomEase';
import 'regenerator-runtime/runtime';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <CustomEase />
  </React.StrictMode>
);