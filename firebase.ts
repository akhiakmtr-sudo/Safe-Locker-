import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// IMPORTANT: This configuration is for a demo project.
// Replace it with your own Firebase project's configuration.
const firebaseConfig = {
  apiKey: "AIzaSyAe9AC1NwaeksZwu8HTklaET0Zbcmls9sA",
  authDomain: "react-media-manager.firebaseapp.com",
  projectId: "react-media-manager",
  storageBucket: "react-media-manager.appspot.com",
  messagingSenderId: "983146325185",
  appId: "1:983146325185:web:948944a00fee461415e040"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get Firebase services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };
