// --- IMPORTANT ---
// To enable Firebase integration, you must create a Firebase project and
// register a web app. Once you have your configuration object, replace
// the placeholder values below.
// For more information, see: https://firebase.google.com/docs/web/setup

export const firebaseConfig = {
  apiKey: "AIzaSyB4tQGmHWKm5oJP8O-QX7t3xdzrkigNyWY",
  authDomain: "wm-consulting-ptiu4.firebaseapp.com",
  databaseURL: "https://wm-consulting-ptiu4-default-rtdb.firebaseio.com",
  projectId: "wm-consulting-ptiu4",
  storageBucket: "wm-consulting-ptiu4.appspot.com",
  messagingSenderId: "116352726771",
  appId: "1:116352726771:web:cab4716642e82d1bb62986"
};

// A simple check to see if the config has been filled out.
export const isFirebaseConfigured = firebaseConfig.apiKey !== "YOUR_API_KEY";