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

// Initialize default user in Firestore (not Firebase Auth)
function initializeDefaultUser() {
  const defaultUser = {
    username: 'Andrew',
    password: 'ROBENHOOD',
    role: 'admin',
    createdAt: firebase.firestore.Timestamp.now()
  };
  
  // Check if default user exists in Firestore
  db.collection("users").where("username", "==", "Andrew").get()
    .then((querySnapshot) => {
      if (querySnapshot.empty) {
        // Create default user in Firestore
        return db.collection("users").add({
          ...defaultUser,
          uid: 'default-andrew-user',
          email: 'andrew@fursatkum.com'
        });
      }
    })
    .then(() => {
      console.log("Default user initialized successfully");
    })
    .catch((error) => {
      console.log("Default user setup:", error.message);
    });
}

// Call initialization when config loads
initializeDefaultUser();