<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/5c8f28e5-79ea-4043-aeae-cb6dc2de2cbd

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Build as Android App (Capacitor)

This project can be packaged as an Android app using Capacitor.

Important: the Android app runs the frontend in a WebView, so your API/backend must be hosted and reachable from the phone.

1. Set your API base URL in `.env` or `.env.local`:
   `VITE_API_BASE_URL=https://your-api-host.example.com`
2. Build web assets:
   `npm run build:web`
3. Add Android platform (first time only):
   `npm run android:add`
4. Sync latest web assets to Android:
   `npm run android:sync`
5. Open in Android Studio:
   `npm run android:open`

From Android Studio, build/install the APK on emulator or device.
