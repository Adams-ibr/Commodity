# Vercel Deployment Guide

Your project is ready to be deployed on Vercel! Since this is a **Vite + React** application, Vercel will automatically detect the settings.

## Prerequisites
1.  A **GitHub** (or GitLab/Bitbucket) account.
2.  A **Vercel** account (you can sign up with GitHub).

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
**Crucial Step:** You must add your environment variables for Supabase and Gemini to work.

In the "Environment Variables" section of the Vercel project setup (or in Settings > Environment Variables after deployment), add the following:

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | *(Copy from your .env file)* |
| `VITE_SUPABASE_ANON_KEY` | *(Copy from your .env file)* |
| `GEMINI_API_KEY` | *(Copy from your .env file)* |
| `SUPABASE_SERVICE_ROLE_KEY` | *(Required for user creation. Found in Supabase > Project Config > API)* |

> **Note:** Do NOT check `.env` files into Git. Keeping them local and setting them manually in Vercel is the secure way.

## Step 4: Finish
Click **Deploy**. Vercel will build your site and give you a live URL (e.g., `https://marhaba-inventory.vercel.app`).
