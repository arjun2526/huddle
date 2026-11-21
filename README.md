# HUDDLE
Instagram-style app (Android, iOS, web) built with Expo + Supabase (free tier).

## 1. Backend (5 min)
1. Create a free project at supabase.com.
2. SQL Editor -> paste `supabase/schema.sql` -> Run.
3. Authentication -> Providers -> Email: for quick testing turn **Confirm email** off.
4. Settings -> API: copy the Project URL and the `anon` key.

## 2. Run locally
```
cp .env.example .env   # paste URL + anon key
npm install
npx expo start         # press w for web, or scan the QR with Expo Go
```

## 3. Deploy on GitHub (web + APK)
1. Create a GitHub repo named **huddle**, push this folder to `main`.
2. Repo -> Settings -> Secrets and variables -> Actions: add `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
3. Repo -> Settings -> Pages -> Source: **GitHub Actions**.
4. Push (or Actions -> Run workflow). Web goes live at `https://<you>.github.io/huddle/`.
5. Actions -> **Build APK** run -> download the `huddle-apk` artifact -> install on Android.
