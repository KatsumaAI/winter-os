# KatsuCases Gist Backup How-To

This build uses **GitHub Gist backup/restore** and now reads the **Gist token + Gist ID from `.env`**, not from the admin JSON config.

## What it backs up
These live JSON data files are stored in the backup Gist:
- `katsucases.json`
- `community.json`
- `casevs.json`
- `replays.json`
- `sessions.json`
- `manifest.json`

## What you need
- A GitHub account
- A GitHub token with Gist access

## .env setup
1. Copy `.env.example` to `.env`
2. Fill in these values:
   - `GIST_BACKUP_TOKEN=...`
   - `GIST_BACKUP_ID=...` (optional for the first backup)
   - `GIST_BACKUP_AUTO_SAVE_MINUTES=30` (or your preferred autosave interval)
   - `GIST_BACKUP_MAX_VERSIONS=12`
3. Restart the server after editing `.env`

## First backup
1. Start KatsuCases.
2. Open the admin page.
3. Go to **Gist Backup & Restore**.
4. Set the backup description / visibility / autosave settings.
5. Click **Backup Now**.
6. If `GIST_BACKUP_ID` was blank, KatsuCases will create a new Gist and show the new ID/URL in the status card.
7. Copy that Gist ID into `.env` if you want restores and future backups to target the same Gist explicitly.

## Restore later
1. Keep the same `GIST_BACKUP_TOKEN` in `.env`.
2. Set `GIST_BACKUP_ID` in `.env`, or paste a specific Gist URL/ID into the restore field in admin.
3. Click **Restore From Gist**.
4. After restore, KatsuCases reloads the data and re-applies the built-in case catalog so new shipped cases are not lost.

## Secret vs public
- Leave **Create a public Gist** unchecked for a secret/unlisted backup.
- Turn it on only if you intentionally want the backup to be public.

## Notes
- The backup Gist stores plain JSON site data.
- Anyone with access to the token can update the backup.
- Secret Gists are not listed publicly, but the URL should still be treated carefully.
- The admin panel stores only display/settings metadata locally now. Credentials stay in `.env`.
