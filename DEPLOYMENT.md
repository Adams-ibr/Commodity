# Vercel Deployment Guide

Your project is ready to be deployed on Vercel! Since this is a **Vite + React** application, Vercel will automatically detect the settings.

## Prerequisites
1.  A **GitHub** (or GitLab/Bitbucket) account.
2.  A **Vercel** account (you can sign up with GitHub).
3.  A **Firebase** project with Firestore and Authentication enabled.

## Step 1: Push your code to GitHub
Since your project is not yet a specific Git repository, follow these steps in your terminal to create one and push it.

1.  Initialize Git:
    ```bash
    git init
    git add .
    git commit -m "Initial commit"
    ```
2.  Go to [GitHub.com/new](https://github.com/new) and create a new repository (e.g., `marhaba-inventory`).
3.  Follow the instructions on GitHub to "push an existing repository from the command line":
    ```bash
    git remote add origin https://github.com/YOUR_USERNAME/marhaba-inventory.git
    git branch -M main
    git push -u origin main
    ```

## Step 2: Deploy on Vercel
1.  Go to your [Vercel Dashboard](https://vercel.com/dashboard).
2.  Click **"Add New..."** -> **"Project"**.
3.  Import the `marhaba-inventory` repository you just created.
4.  Vercel will auto-detect "Vite". The default Build Command (`vite build`) and Output Directory (`dist`) are correct.

## Step 3: Configure Environment Variables
**Crucial Step:** You must add your Firebase and Gemini environment variables for the application to work.

In the "Environment Variables" section of the Vercel project setup (or in Settings > Environment Variables after deployment), add the following:

### Frontend Variables (Vite)

These are exposed to the React frontend and must be prefixed with `VITE_`. Find them in the [Firebase Console](https://console.firebase.google.com/) under **Project Settings > Your Apps > SDK setup and configuration**.

| Name | Value |
|------|-------|
| `VITE_FIREBASE_API_KEY` | *(Firebase Console > Project Settings > Your Apps)* |
| `VITE_FIREBASE_AUTH_DOMAIN` | *(Firebase Console > Project Settings > Your Apps)* |
| `VITE_FIREBASE_PROJECT_ID` | *(Firebase Console > Project Settings > Your Apps)* |
| `VITE_FIREBASE_STORAGE_BUCKET` | *(Firebase Console > Project Settings > Your Apps)* |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | *(Firebase Console > Project Settings > Your Apps)* |
| `VITE_FIREBASE_APP_ID` | *(Firebase Console > Project Settings > Your Apps)* |
| `GEMINI_API_KEY` | *(Copy from your .env file)* |

### Serverless Function Variables (Firebase Admin SDK)

These are used by the Vercel serverless functions (`api/createUser.js`, `api/cron/keep-alive.js`) and are **not** prefixed with `VITE_`. Generate a service account key in the [Firebase Console](https://console.firebase.google.com/) under **Project Settings > Service Accounts > Generate new private key**.

| Name | Value |
|------|-------|
| `FIREBASE_PROJECT_ID` | *(Firebase Console > Project Settings > Service Accounts)* |
| `FIREBASE_CLIENT_EMAIL` | *(From the downloaded service account JSON: `client_email`)* |
| `FIREBASE_PRIVATE_KEY` | *(From the downloaded service account JSON: `private_key` — include the full value with `\n` newlines)* |

> **Note:** Do NOT check `.env` files or `serviceAccountKey.json` to Git. Set all secrets manually in Vercel and keep the downloaded service account JSON file local only.

## Step 4: Finish
Click **Deploy**. Vercel will build your site and give you a live URL (e.g., `https://marhaba-inventory.vercel.app`).
