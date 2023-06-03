import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.scss';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCI5pnnoKyC9g1AHSN0qq_xkGc3bOaUSPk",
  authDomain: "word-player-sweeny.firebaseapp.com",
  projectId: "word-player-sweeny",
  storageBucket: "word-player-sweeny.appspot.com",
  messagingSenderId: "904947896904",
  appId: "1:904947896904:web:0a2085a0fed5025e153e7d",
  measurementId: "G-ZHFWCJ21E1"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
