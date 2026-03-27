<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/fe880063-bf66-4a3e-ad58-9ebb4b01f31f

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Authenticate your machine with Google Cloud Application Default Credentials:
   `gcloud auth application-default login`
3. Configure Vertex AI in [.env.local](.env.local):
   `GOOGLE_CLOUD_PROJECT=your-project-id`
   `GOOGLE_CLOUD_LOCATION=global`
   `GOOGLE_GENAI_USE_VERTEXAI=true`
4. Run the app:
   `npm run dev`

`GEMINI_API_KEY` is no longer required.
