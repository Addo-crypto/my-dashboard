# Turning on messages

The contact forms on Studio, Glass and Neon can do two things:

- **Email you** every message, through Web3Forms (free).
- **Save** every message in Firebase so you can read it in the **Owner inbox** on any of the three pages.

You can turn on either one or both. Until then, the form opens the visitor's own email app instead.

## 1. Email notifications (Web3Forms, about 2 minutes)

1. Go to https://web3forms.com and enter `shepherdanoche5@gmail.com` to create an access key.
2. Copy the access key from the email they send you.
3. Put it in `config.js`:

   ```js
   export const WEB3FORMS_KEY = "your-access-key";
   ```

## 2. Inbox (Firebase, about 10 minutes)

1. Open https://console.firebase.google.com and pick a project (or create one, for example `addo-corp`).
2. **Add a web app:** Project settings → Your apps → Web (`</>`). Copy `apiKey`, `authDomain`, `projectId` and `appId` into `config.js`:

   ```js
   export const FIREBASE = {
     apiKey: "...",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project",
     appId: "..."
   };
   ```

3. **Sign-in:** Build → Authentication → Get started → Sign-in method → turn on **Email/Password**.
4. **Your account:** Authentication → Users → Add user → `shepherdanoche5@gmail.com` and a strong password. Copy the **User UID** it shows.
5. **Allow your website:** Authentication → Settings → Authorized domains → Add `addo-crypto.github.io`.
6. **Database:** Build → Firestore Database → Create database (production mode).
7. **Rules:** Firestore → Rules → paste the contents of `firestore.rules`, replace `OWNER_UID` with your User UID, then **Publish**.

## Using the inbox

- **Studio:** footer → **Owner inbox**, or open `https://addo-crypto.github.io/my-dashboard/#inbox`.
- **Glass:** the envelope button in the left sidebar. An orange dot means unread messages.
- **Neon:** the envelope button in the left rail, or **Owner inbox** in the footer.

Sign in with your Firebase email and password. New messages appear live. You can reply by email, mark them read or unread, copy the sender's email, search and delete.

## Security

- The Firebase config and Web3Forms key are public identifiers, made to sit in website code. They are not passwords.
- The Firestore rules let anyone **create** one well-formed message, and only your account (by User UID) **read, mark or delete** messages.
- Never put your Firebase password in any file.
- The form has a hidden spam trap. If spam becomes a problem, turn on Firebase App Check.
