import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDxx6zsgzp5fuSe0X_WNA6M9ixfPPCt-d8",
  authDomain: "artistic-flow.firebaseapp.com",
  projectId: "artistic-flow",
  storageBucket: "artistic-flow.firebasestorage.app",
  messagingSenderId: "275111926458",
  appId: "1:275111926458:web:512a1ebd742278a247c083"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
