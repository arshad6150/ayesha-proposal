# Ayesha Proposal Website — Setup Guide

## What's in this folder

```
ayesha-proposal/
├── index.html          → the main proposal site
├── admin.html           → password-protected dashboard for you
├── css/style.css
├── js/firebase-config.js  → paste your Firebase project config here
├── js/app.js               → all the site's logic
├── js/admin.js             → dashboard logic
```

This project uses only **Firestore + Authentication** — no Firebase
Storage, no paid APIs — so it runs entirely on the free **Spark plan**.

## What data this site stores — and why

This build only stores what she can see happening on the page: her
Yes/No answer, how many times she dodged "No", and her written
message. A small note on the message screen tells her what's being
saved and that it's for you. There's no hidden device fingerprinting,
screen size, timezone, or voice recording.

Fields saved per visitor in Firestore (`visitors` collection):

- `status` — "pending" / "yes" / "no"
- `visitTime` — when she opened the site
- `yesClicked` — true if she pressed YES
- `noClicked` — true if she pressed NO (after the playful dodging ends)
- `noAttempts` — how many times the NO button dodged her
- `heartMessage` — her written message
- `messageLength` — character count of her message
- `submittedAt` — when she sent her message
- `timeSpent` — seconds spent on the page

## 1. Create a Firebase project

1. Go to https://console.firebase.google.com and create a project.
2. In the project, click **Add app → Web** and copy the config object.
3. Paste that config into `js/firebase-config.js`, replacing the placeholders.

## 2. Enable the services you need

In the Firebase console:

- **Firestore Database** → Create database → start in **production mode**.
- **Authentication → Sign-in method**:
  - Enable **Anonymous** (used so visitors can write their own message).
  - Enable **Email/Password** (used only for you to log into `admin.html`).
- **Authentication → Users → Add user** — create yourself an admin
  login (your email + a strong password). This is the only account
  that should be able to read the visitors collection.

## 3. Firestore security rules

Go to **Firestore → Rules** and use something like this — it lets
anonymous visitors create/update only their *own* document, but only
your signed-in admin account can read the full list:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /visitors/{visitorId} {
      allow create: if request.auth != null;
      allow update: if request.auth != null
                    && request.auth.uid == resource.data.authorUid;
      allow read: if request.auth != null
                  && request.auth.token.email == "YOUR_ADMIN_EMAIL@example.com";
    }
  }
}
```

Replace `YOUR_ADMIN_EMAIL@example.com` with the admin account you
created in step 2. (For a simpler first pass you can allow any signed-in
user to read/write while you're testing, then tighten this before sharing
the real link.)

## 4. Test locally

Because this uses ES modules (`type="module"`), opening `index.html`
directly from your file system may be blocked by the browser. Serve it
locally instead, for example:

```
npx serve .
```

then open the printed `http://localhost:...` address.

## 5. Deploy to Firebase Hosting

```
npm install -g firebase-tools
firebase login
firebase init hosting   # choose this folder as the public directory
firebase deploy
```

Firebase will give you a live URL (something like
`https://your-project.web.app`) you can send to her. Hosting, Firestore,
and Authentication are all covered by the free Spark plan for this
project's scale — no billing account required.

## 6. Logging into admin.html

Go to `https://your-project.web.app/admin.html` and log in with the
email/password you created in step 2. You'll see total visitors, her
answer, her message, and stats — no audio/voice components anymore.
