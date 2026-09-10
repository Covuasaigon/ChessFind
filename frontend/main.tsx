import React from 'react';
import { createRoot } from 'react-dom/client';
import ChessApp from './app/chess-app';
import './app/globals.css';

createRoot(document.getElementById('root')!).render(<ChessApp />);
