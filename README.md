# Family Lift

A 3-day gym plan for Moe, Pyae and Htet, with a shared weight log that lives in a Google Sheet.

```
index.html          the app (plan, logging, progress)
config.js           where you paste the Google Sheet API URL
apps-script/Code.gs the API that reads and writes the Sheet
```

How it fits together: the phone opens the app on Vercel → the app sends logs to a small Google Apps Script → the script writes rows into your Sheet. No servers or API keys to manage, and it's free.

---

## 1. Make the Sheet (personal Google account)

1. Go to sheets.google.com while signed in to your **personal** account and create a blank sheet. Name it something like `Family Lift Log`.
2. You don't need to add anything. The script creates a `logs` tab with headers the first time someone saves a weight.

## 2. Add the API script

1. In the Sheet: **Extensions → Apps Script**.
2. Delete the sample code, paste in everything from `apps-script/Code.gs`, and click **Save**.
3. Change this line to a PIN only your family knows:
   ```js
   const FAMILY_PIN = "change-me";
   ```
   Save again.
4. Click **Deploy → New deployment**. Click the gear next to "Select type" and pick **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Click **Deploy**, then **Authorize access** and pick your personal account.
   Google warns that the app isn't verified. That's expected for your own script: click **Advanced → Go to (project name) (unsafe) → Allow**.
6. Copy the **Web app URL** (it ends in `/exec`).

"Anyone" lets the app reach the script without a Google login. The script rejects every request that doesn't carry your family PIN, and it can only touch this one Sheet.

## 3. Connect the app

Open `config.js` and paste the URL:

```js
window.FAMILY_LIFT_CONFIG = {
  apiUrl: "https://script.google.com/macros/s/AKfy.../exec"
};
```

Don't put the PIN in this file. Everyone types it once on their own phone.

## 4. Put it on Vercel

It's a static site, so there's no build step.

**Option A: through GitHub (nothing to install)**
1. Create a new **private** repository on github.com and upload the files in this folder (`index.html`, `config.js`, and the rest).
2. On vercel.com: **Add New → Project → Import** that repository.
3. Framework preset: **Other**. Leave the build settings empty. Click **Deploy**.
4. You get a URL like `family-lift.vercel.app`. Every time you push a change to GitHub, Vercel redeploys it.

**Option B: from a terminal (needs Node.js)**
```bash
npx vercel deploy --prod
```

## 5. On each phone

1. Open the Vercel URL, pick your name, and enter the family PIN once.
2. Add it to your home screen so it opens like an app:
   - iPhone (Safari): Share → **Add to Home Screen**
   - Android (Chrome): ⋮ menu → **Add to Home screen**

---

## Changing things later

- **Changing the script:** after editing `Code.gs`, go to **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**. This keeps the same URL. ("New deployment" would give you a new URL, and you'd have to update `config.js`.)
- **Changing the PIN:** edit `FAMILY_PIN`, then redeploy as above. Each phone will ask for the new PIN.
- **Fixing a wrong entry:** delete it from History in the app, or edit or delete the row in the Sheet. Keep the `id` and `timestamp` columns as they are.
- **Changing names:** they're in `index.html` (`const P = ...`) and in `Code.gs` (`const PEOPLE = ...`). Keep both the same.
