# Flathub Submission Guide for AI Gate

## Files in this directory

| File | Purpose |
|------|---------|
| `com.inulute.aigate.yml` | Flatpak manifest (the main build recipe) |
| `com.inulute.aigate.metainfo.xml` | AppStream metadata (description, screenshots, releases) |
| `com.inulute.aigate.desktop` | Desktop entry |
| `com.inulute.aigate.png` | App icon (1024×1024) |

---

## Step 1 — Trigger a new release to get the Linux zip

The manifest uses `AI-Gate-X.Y.Z.zip` from GitHub Releases. This zip is now
produced by the CI (added `zip` to the Linux build targets in `package.json`).

If you haven't released v4.5.0 yet with the new zip, push a new tag:

```bash
git tag v4.5.0 && git push origin v4.5.0
```

Wait for CI to finish, then find the zip SHA256 in `SHA256SUMS.txt` attached
to the release:

```bash
# Download and hash the zip
curl -L https://github.com/inulute/ai-gate/releases/download/v4.5.0/AI-Gate-4.5.0.zip \
  | sha256sum
```

Replace `REPLACE_WITH_SHA256_OF_AI-Gate-4.5.0.zip` in `com.inulute.aigate.yml`
with the real hash.

---

## Step 2 — Test the Flatpak locally

```bash
# Install dependencies (once)
flatpak install flathub org.freedesktop.Platform//24.08 org.freedesktop.Sdk//24.08
flatpak install flathub org.electronjs.Electron2.BaseApp//24.08

# Build and install locally
cd flatpak/
flatpak-builder --force-clean --install --user build-dir com.inulute.aigate.yml

# Run it
flatpak run com.inulute.aigate
```

---

## Step 3 — Validate AppStream metainfo

```bash
flatpak run --command=appstream-util org.freedesktop.appstream-glib \
  validate com.inulute.aigate.metainfo.xml
```

Or with `appstreamcli`:

```bash
appstreamcli validate --no-net com.inulute.aigate.metainfo.xml
```

---

## Step 4 — Submit to Flathub

1. Fork https://github.com/flathub/flathub
2. Create a new branch: `add-com.inulute.aigate`
3. Create a directory `com.inulute.aigate/` in the fork root
4. Copy these four files into it:
   - `com.inulute.aigate.yml`
   - `com.inulute.aigate.metainfo.xml`
   - `com.inulute.aigate.desktop`
   - `com.inulute.aigate.png`
5. Open a PR to `flathub/flathub` — title: `Add com.inulute.aigate`
6. Flathub bot will run automated checks; fix any reported issues

---

## Updating for future releases

When you release a new version (e.g. v4.6.0):

1. Update the `url` and `sha256` in `com.inulute.aigate.yml`
2. Add a new `<release>` block in `com.inulute.aigate.metainfo.xml`
3. Open a PR to your Flathub app repo (`flathub/com.inulute.aigate`)

Flathub maintains a separate repo per app after acceptance:
`https://github.com/flathub/com.inulute.aigate`
