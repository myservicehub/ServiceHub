# SendGrid Configuration Guide for Password Reset Emails

## Issue: 401 Unauthorized Error

If you're seeing `ERROR:notifications:❌ Email sending failed: HTTP Error 401: Unauthorized`, it means SendGrid is rejecting your API key or sender email.

## Steps to Fix SendGrid Configuration

### 1. Verify SendGrid API Key

1. **Log into SendGrid Dashboard**: https://app.sendgrid.com/
2. **Navigate to Settings → API Keys**
3. **Create or Verify API Key**:
   - Click "Create API Key"
   - Give it a name (e.g., "ServiceHub Production")
   - Select **"Full Access"** or at minimum **"Mail Send"** permissions
   - Copy the API key immediately (you can only see it once!)

### 2. Verify Sender Email in SendGrid

The sender email **MUST** be verified in SendGrid:

1. **Navigate to Settings → Sender Authentication**
2. **Single Sender Verification** (for testing):
   - Click "Create New Sender"
   - Enter your email address (e.g., `no-reply@servicehub.ng`)
   - Verify the email by clicking the link SendGrid sends
   
   OR

3. **Domain Authentication** (for production - recommended):
   - Click "Authenticate Your Domain"
   - Follow the DNS setup instructions
   - This allows you to send from any email @yourdomain.com

### 3. Set Environment Variables on Render

1. **Go to your Render Dashboard**
2. **Navigate to your service → Environment**
3. **Add/Update these environment variables**:

   ```
   SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   SENDER_EMAIL=no-reply@servicehub.ng
   ```

   **Important Notes**:
   - Use the **full API key** (starts with `SG.`)
   - `SENDER_EMAIL` must match the verified email in SendGrid
   - No quotes around the values
   - No spaces before/after the `=`

4. **Save and Redeploy** your service

### 4. Verify Configuration

After redeploying, check your logs. You should see:
- ✅ `🔧 SendGridEmailService initialized - Production Mode`
- ✅ `📧 EMAIL SENT: to=user@example.com, subject=...`

If you still see errors, check:
- API key is correctly copied (no extra spaces/characters)
- Sender email is verified in SendGrid
- API key has "Mail Send" permissions
- Environment variables are set correctly (case-sensitive)

## Common Issues

### Issue: "API key is invalid"
**Solution**: Regenerate the API key in SendGrid and update the environment variable

### Issue: "Sender email not verified"
**Solution**: Verify the sender email in SendGrid's Sender Authentication settings

### Issue: "API key doesn't have permissions"
**Solution**: Create a new API key with "Full Access" or "Mail Send" permissions

### Issue: Environment variable not loading
**Solution**: 
- Verify variable names are exactly `SENDGRID_API_KEY` and `SENDER_EMAIL`
- Restart/redeploy your service after adding variables
- Check Render logs to confirm variables are loaded

## Testing

After fixing the configuration:

1. Try the forgot password flow again
2. Check Render logs for:
   - `✅ Password reset email sent successfully to user@example.com`
3. Check the user's email inbox (and spam folder)
4. The reset link should work: `https://servicehub.ng/reset-password?token=...`

## Alternative: Use Mock Email Service (Development Only)

If you want to test without SendGrid (emails won't actually be sent):
- Don't set `SENDGRID_API_KEY` and `SENDER_EMAIL`
- The system will automatically use `MockEmailService`
- Check logs for `📧 MOCK EMAIL: to=...` messages

## Security Notes

- Never commit API keys to Git
- Use environment variables for all secrets
- Rotate API keys periodically
- Use domain authentication for production (not single sender)
- Monitor SendGrid dashboard for unusual activity

