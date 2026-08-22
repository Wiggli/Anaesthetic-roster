# Anaesthetic Night Roster V26 deployment

1. Upload every file and folder in this package to the root of the GitHub repository. Keep the `.github` folder because it tests the roster before publishing the page.
2. Open Supabase SQL Editor, paste the complete contents of `supabase-v26-upgrade.sql`, and run it once. A successful run ends with `V26 database upgrade completed successfully`.
3. Commit the GitHub changes. The Test and deploy GitHub Pages action will validate the original rotation, staffing counts, the 19:00 to 07:00 working-night rule, and PWA cache safety before deployment.
4. When the action finishes, open the installed app. If an update is ready, use the update banner once. Colleagues will receive the same update when their app next becomes active and online.

The publishable Supabase key is intentionally present in the browser app. Row Level Security and the authorised account list protect shared data. Never place a Supabase secret or service-role key in these files.
