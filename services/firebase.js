import { initializeApp, getApps } from "firebase/app";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: "AIzaSyCJsxFBcOuU8vqav8YJIEWTuh4MX_EMX3s",
  authDomain: "todopalnegocio.firebaseapp.com",
  projectId: "todopalnegocio",
  storageBucket: "todopalnegocio.firebasestorage.app",
  messagingSenderId: "1041797301392",
  appId: "1:1041797301392:web:001a384dd25c8cae7b8415",
  measurementId: "G-P4C0ED8KL2",
};

export const firebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// Devuelve el token FCM para web push
export async function getWebFCMToken() {
  if (Platform.OS !== "web") return null;
  try {
    const { getMessaging, getToken } = await import("firebase/messaging");
    const messaging = getMessaging(firebaseApp);
    const token = await getToken(messaging, {
      vapidKey: "BHPhOGXRwyBLgVGbhdHJtRVcwEBwwXykjMQf12C_1amHJ2nvxgNTrh0bE0LqSEurPf2oO_rZQ1uZkI3YrRFvYdU",
    });
    return token || null;
  } catch {
    return null;
  }
}
