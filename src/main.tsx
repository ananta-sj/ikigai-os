import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { AppMotionProvider } from './components/AppMotionProvider';
import './styles.css';
import './theme-system.css';
import './design-system.css';
import './reimagine.css';
import './navigation-guide-v027.css';
import './navigation-v028.css';
import './adaptive-ui-v032.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><AppErrorBoundary><AppMotionProvider><App /></AppMotionProvider></AppErrorBoundary></React.StrictMode>
);
