<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# AgenticDev Orchestrator

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
4. Optional: configure NVIDIA NIM models in [.env.local](.env.local):
   `NVIDIA_API_KEY=your-nvidia-api-key`
5. Configure the local Supabase instance in [.env.local](.env.local):
   `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:56321`
   `NEXT_PUBLIC_SUPABASE_ANON_KEY=...`
   `SUPABASE_SERVICE_ROLE_KEY=...`
   `NEXT_PUBLIC_SUPABASE_AUTH_REDIRECT_TO=http://127.0.0.1:3000`
6. Configure Google OAuth in `supabase/config.toml` and the local `.env` file used by the Supabase CLI.
   In Google Cloud Console, add this exact Authorized redirect URI:
   `http://127.0.0.1:56321/auth/v1/callback`
7. Run the app:
   `npm run dev`

`GEMINI_API_KEY` is no longer required.
