// firebase-config.js

// New Firebase configuration using compat libraries.
const firebaseConfig = {
  apiKey: "AIzaSyCxs2dqhkoTrsUfZtqxH2EhZD7MqclNGf0",
  authDomain: "fursatkum-videos.firebaseapp.com",
  projectId: "fursatkum-videos",
  storageBucket: "fursatkum-videos.firebasestorage.app",
  messagingSenderId: "699158181842",
  appId: "1:699158181842:web:a55a2cdf6d76d15c8c3a0b",
  measurementId: "G-HCTPLVZ620"
};

// Initialize Firebase using the compat libraries.
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();