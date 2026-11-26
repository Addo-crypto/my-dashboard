// Addo.corp messaging settings.
// These values are public identifiers, not secrets: Firebase web config and the
// Web3Forms access key are designed to live in browser code. Your security comes
// from the Firestore rules (firestore.rules), which let only your account read messages.

// Firebase web app config: Firebase console → Project settings → Your apps → Web app.
export const FIREBASE = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  appId: ""
};

// The email you sign in with to read the inbox.
export const OWNER_EMAIL = "shepherdanoche5@gmail.com";

// Web3Forms access key (free, from web3forms.com). Sends each message to your email.
export const WEB3FORMS_KEY = "";
