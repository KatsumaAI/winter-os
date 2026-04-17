# KatsuCases Gist Backup How-To

This build uses **GitHub Gist backup/restore** instead of a local Git repo.

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
- A GitHub token that can create and update Gists

## Fast setup
1. Sign in to GitHub.
2. Create a personal access token.
3. Give the token Gist access.
4. Open the KatsuCases admin page.
5. Go to **Gist Backup & Restore**.
6. Paste your token into **GitHub token**.
7. Leave **Gist ID or URL** empty the first time if you want KatsuCases to create the backup Gist for you automatically.
8. Click **Backup Now**.
9. After the first backup, KatsuCases will save the returned Gist ID in the config.

## Restore later
1. Open the admin page.
2. Paste the same token.
3. Leave restore blank to use the saved Gist, or paste another Gist URL/ID into **Restore Gist ID or URL**.
4. Click **Restore From Gist**.

## Secret vs public
- Leave **Create a public Gist** unchecked for a secret/unlisted backup.
- Turn it on only if you intentionally want the backup to be public.

## Notes
- The backup Gist stores plain JSON site data.
- Anyone with access to the token can update the backup.
- Secret Gists are not listed publicly, but the URL should still be treated carefully.
- After a restore, KatsuCases reloads its data from disk.
