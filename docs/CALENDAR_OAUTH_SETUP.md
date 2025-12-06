# Calendar OAuth Setup Guide

This guide walks you through obtaining OAuth credentials for Google Calendar and Microsoft Outlook Calendar integration.

---

## Google Calendar OAuth Setup

### Step 1: Access Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account

### Step 2: Create or Select a Project
1. Click on the project dropdown at the top of the page
2. Either:
   - Select an existing project (e.g., "CapMatch")
   - Click **"NEW PROJECT"** to create one
3. If creating new:
   - Enter project name: `CapMatch` (or your preferred name)
   - Click **"CREATE"**

### Step 3: Enable Google Calendar API
1. In the left sidebar, go to **"APIs & Services"** → **"Library"**
2. Search for **"Google Calendar API"**
3. Click on **"Google Calendar API"**
4. Click **"ENABLE"**

### Step 4: Configure OAuth Consent Screen
1. Go to **"APIs & Services"** → **"OAuth consent screen"**
2. Choose **"External"** (unless you have a Google Workspace account)
3. Click **"CREATE"**
4. Fill in the required information:
   - **App name**: `CapMatch`
   - **User support email**: Your email
   - **Developer contact email**: Your email
5. Click **"SAVE AND CONTINUE"**
6. On **"Scopes"** page:
   - Click **"ADD OR REMOVE SCOPES"**
   - Search and add:
     - `https://www.googleapis.com/auth/calendar.readonly`
     - `https://www.googleapis.com/auth/calendar.events.readonly`
   - Click **"UPDATE"** then **"SAVE AND CONTINUE"**
7. On **"Test users"** page (if in Testing mode):
   - Click **"ADD USERS"**
   - Add email addresses of users who can test (yourself and team members)
   - Click **"SAVE AND CONTINUE"**
8. Review and click **"BACK TO DASHBOARD"**

### Step 5: Create OAuth 2.0 Credentials
1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"CREATE CREDENTIALS"** → **"OAuth client ID"**
3. Choose application type: **"Web application"**
4. Fill in details:
   - **Name**: `CapMatch Web Client`
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (for development)
     - `https://yourdomain.com` (for production)
   - **Authorized redirect URIs**:
     - `http://localhost:3000/api/calendar/callback` (for development)
     - `https://yourdomain.com/api/calendar/callback` (for production)
5. Click **"CREATE"**

### Step 6: Copy Credentials
A dialog will appear with your credentials:
- **Client ID**: Copy this value → Use as `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- **Client Secret**: Copy this value → Use as `GOOGLE_CLIENT_SECRET`

**Important**: Keep the Client Secret secure and never commit it to version control!

### Step 7: Add to Environment Variables
In your `.env.local` file:
```bash
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_copied_client_id_here
GOOGLE_CLIENT_SECRET=your_copied_client_secret_here
```

---

## Microsoft Outlook Calendar OAuth Setup

### Step 1: Access Azure Portal
1. Go to [Azure Portal](https://portal.azure.com/)
2. Sign in with your Microsoft account

### Step 2: Navigate to Azure AD App Registrations
1. Search for **"Azure Active Directory"** in the top search bar (or **"Microsoft Entra ID"**)
2. Click on it
3. In the left sidebar, click **"App registrations"**
4. Click **"+ New registration"**

### Step 3: Register Your Application
1. Fill in the registration form:
   - **Name**: `CapMatch Calendar Integration`
   - **Supported account types**: Select **"Accounts in any organizational directory and personal Microsoft accounts"**
   - **Redirect URI**:
     - Platform: **Web**
     - URI: `http://localhost:3000/api/calendar/callback` (for development)
2. Click **"Register"**

### Step 4: Copy Application (Client) ID
1. On the **Overview** page, you'll see:
   - **Application (client) ID**: Copy this → Use as `NEXT_PUBLIC_MICROSOFT_CLIENT_ID`
   - **Directory (tenant) ID**: Note this (you may need it later)

### Step 5: Create Client Secret
1. In the left sidebar, click **"Certificates & secrets"**
2. Click **"+ New client secret"**
3. Fill in:
   - **Description**: `CapMatch Web Client Secret`
   - **Expires**: Choose duration (recommended: 24 months)
4. Click **"Add"**
5. **IMPORTANT**: Copy the **Value** immediately (it won't be shown again!)
   - This is your **Client Secret** → Use as `MICROSOFT_CLIENT_SECRET`

### Step 6: Configure API Permissions
1. In the left sidebar, click **"API permissions"**
2. Click **"+ Add a permission"**
3. Select **"Microsoft Graph"**
4. Choose **"Delegated permissions"**
5. Search and add:
   - `Calendars.Read`
   - `offline_access` (for refresh tokens)
6. Click **"Add permissions"**
7. *Optional*: Click **"Grant admin consent"** if you're an admin (makes approval easier for users)

### Step 7: Add Redirect URIs
1. In the left sidebar, click **"Authentication"**
2. Under **"Platform configurations"**, click **"Add a platform"**
3. Choose **"Web"**
4. Add redirect URIs:
   - `http://localhost:3000/api/calendar/callback` (development)
   - `https://yourdomain.com/api/calendar/callback` (production)
5. Under **"Implicit grant and hybrid flows"**, enable:
   - ✅ **ID tokens** (optional, for user info)
6. Click **"Configure"**
7. Scroll down and click **"Save"**

### Step 8: Add to Environment Variables
In your `.env.local` file:
```bash
NEXT_PUBLIC_MICROSOFT_CLIENT_ID=your_copied_application_id_here
MICROSOFT_CLIENT_SECRET=your_copied_client_secret_here
```

---

## Complete .env.local Example

Your `.env.local` file should now include:

```bash
# Existing Supabase variables
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxx

# Existing AI variables
GEMINI_API_KEY=xxxxx
NEXT_PUBLIC_USE_MOCK_DATA=false

# Google Calendar OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=123456789012-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-AbCdEfGhIjKlMnOpQrStUvWxYz

# Microsoft Calendar OAuth
NEXT_PUBLIC_MICROSOFT_CLIENT_ID=12345678-1234-1234-1234-123456789012
MICROSOFT_CLIENT_SECRET=AbC~dEf1GhI2jKl3MnO4pQr5StU6vWx7YzA8
```

---

## Testing Your Setup

### Test Google Calendar Connection
1. Start your development server: `npm run dev`
2. Go to Settings → Calendar tab
3. Click **"Google Calendar"**
4. You should be redirected to Google's consent screen
5. Grant permissions
6. You should be redirected back with your calendars listed

### Test Microsoft Calendar Connection
1. In Settings → Calendar tab
2. Click **"Microsoft Outlook"**
3. You should be redirected to Microsoft's consent screen
4. Grant permissions
5. You should be redirected back with your calendars listed

---

## Troubleshooting

### Google Calendar Issues

**"redirect_uri_mismatch" error**
- Ensure the redirect URI in your Google Cloud Console exactly matches:
  - Development: `http://localhost:3000/api/calendar/callback`
  - Production: `https://yourdomain.com/api/calendar/callback`
- No trailing slashes!

**"Access blocked: This app's request is invalid"**
- Make sure you've added yourself as a test user in the OAuth consent screen
- Verify the Calendar API is enabled

**"invalid_client" error**
- Double-check your Client ID and Client Secret in `.env.local`
- Restart your dev server after changing environment variables

### Microsoft Calendar Issues

**"AADSTS50011: The redirect URI specified in the request does not match"**
- Verify redirect URIs in Azure Portal → App registrations → Authentication
- Must exactly match the callback URL

**"AADSTS65001: The user or administrator has not consented"**
- Add required permissions in API permissions
- Try granting admin consent if available
- Make sure you selected "Accounts in any organizational directory and personal Microsoft accounts"

**"invalid_client" error**
- Verify Application (client) ID and Client Secret are correct
- Make sure the client secret hasn't expired

### General Issues

**Environment variables not working**
- Restart your Next.js dev server after adding/changing `.env.local`
- Make sure `.env.local` is in your project root directory
- Verify no typos in variable names

**OAuth flow not starting**
- Check browser console for errors
- Verify `NEXT_PUBLIC_` prefix for client-side variables
- Ensure no special characters in environment variable values

---

## Security Best Practices

1. **Never commit secrets to Git**:
   - Ensure `.env.local` is in your `.gitignore`
   - Use different credentials for development and production

2. **Rotate secrets regularly**:
   - Change Client Secrets every 6-12 months
   - Immediately rotate if compromised

3. **Use minimal scopes**:
   - Only request calendar read permissions (already configured)
   - Don't request write access unless needed

4. **Encrypt tokens in database**:
   - Consider encrypting access/refresh tokens before storing
   - Use Supabase's encryption features or application-level encryption

5. **Monitor API usage**:
   - Check Google Cloud Console and Azure Portal for unusual activity
   - Set up billing alerts to catch abuse

---

## Production Deployment

When deploying to production:

1. **Create production OAuth credentials** (separate from development)
2. **Update redirect URIs** to your production domain
3. **Set environment variables** in your hosting platform (Vercel, AWS, etc.)
4. **Google OAuth verification**:
   - For production, submit your app for Google verification
   - This removes the "unverified app" warning
5. **Microsoft certification** (optional):
   - Consider Microsoft Publisher Verification for enterprise credibility

---

## Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Calendar API Documentation](https://developers.google.com/calendar/api)
- [Microsoft Identity Platform Documentation](https://learn.microsoft.com/en-us/azure/active-directory/develop/)
- [Microsoft Graph Calendar API](https://learn.microsoft.com/en-us/graph/api/resources/calendar)

---

## Need Help?

If you encounter issues:
1. Check the troubleshooting section above
2. Verify all redirect URIs match exactly
3. Ensure environment variables are set correctly
4. Check browser console and server logs for error messages
5. Review the OAuth consent screen configuration

For CapMatch-specific issues, check the application logs and ensure the database migration has been applied.
