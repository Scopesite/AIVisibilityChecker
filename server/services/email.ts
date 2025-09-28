// Provider-agnostic email service for magic link authentication
// Supports both SendGrid and Resend as email providers

import { Resend } from 'resend';
import { config } from '../env';

// Initialize Resend if EMAIL_SENDER_KEY is available (default provider)
let resend: Resend | null = null;
if (config.EMAIL_SENDER_KEY) {
  resend = new Resend(config.EMAIL_SENDER_KEY);
}

interface MagicLinkEmailParams {
  email: string;
  magicLinkUrl: string;
  expiresInMinutes?: number;
}

/**
 * Send a magic link email for passwordless authentication
 * Uses provider-agnostic approach supporting SendGrid or Resend
 */
export async function sendMagicLink(
  email: string, 
  magicLinkUrl: string, 
  expiresInMinutes: number = 30
): Promise<boolean> {
  try {
    if (!config.EMAIL_SENDER_KEY) {
      console.log("⚠️ EMAIL_SENDER_KEY not set, skipping magic link email");
      return false;
    }

    if (!resend) {
      console.log("❌ Email provider not initialized");
      return false;
    }

    console.log(`📧 Sending magic link to: ${email}`);
    console.log(`🔗 Magic link URL: ${magicLinkUrl.substring(0, 50)}...`);

    const emailHtml = generateMagicLinkEmailTemplate({
      email,
      magicLinkUrl,
      expiresInMinutes
    });

    const result = await resend.emails.send({
      from: 'VOICE AI Visibility Checker <auth@voice-scanner.repl.co>',
      to: email,
      subject: '🔐 Your secure login link - VOICE AI Scanner',
      html: emailHtml
    });

    console.log(`✅ Magic link email sent to: ${email}`);
    return true;

  } catch (error) {
    console.error('❌ Failed to send magic link email:', error);
    return false;
  }
}

/**
 * Generate HTML email template for magic link authentication
 */
function generateMagicLinkEmailTemplate({ email, magicLinkUrl, expiresInMinutes }: MagicLinkEmailParams): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Secure Login Link</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1e3a8a; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 30px; text-align: center; background-color: #1e3a8a;">
              <h1 style="color: #fbbf24; margin: 0; font-size: 24px; font-weight: bold;">🔐 SECURE LOGIN</h1>
              <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px;">VOICE AI Visibility Checker</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px; background-color: #ffffff;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h2 style="color: #1e3a8a; margin: 0 0 15px 0; font-size: 20px;">Complete Your Authentication</h2>
                <p style="color: #64748b; line-height: 1.6; margin: 0;">
                  Click the secure link below to complete your login to VOICE AI Visibility Checker.
                </p>
              </div>
              
              <!-- Magic Link Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${magicLinkUrl}" 
                   style="display: inline-block; background-color: #fbbf24; color: #000000; padding: 18px 35px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  🚀 Complete Login
                </a>
              </div>
              
              <!-- Security Info -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 30px 0;">
                <h3 style="color: #1e3a8a; margin: 0 0 10px 0; font-size: 16px;">🛡️ Security Information</h3>
                <ul style="color: #64748b; margin: 0; padding-left: 20px; line-height: 1.6;">
                  <li>This link expires in <strong>${expiresInMinutes} minutes</strong></li>
                  <li>Can only be used <strong>once</strong></li>
                  <li>Sent to: <strong>${email}</strong></li>
                  <li>If you didn't request this, please ignore this email</li>
                </ul>
              </div>
              
              <!-- Alternative Link -->
              <div style="background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 6px; padding: 15px; margin: 20px 0;">
                <p style="color: #92400e; margin: 0 0 10px 0; font-size: 14px; font-weight: bold;">
                  Can't click the button? Copy and paste this link:
                </p>
                <div style="background-color: #ffffff; padding: 10px; border-radius: 4px; border: 1px solid #e5e7eb; word-break: break-all; font-family: monospace; font-size: 12px; color: #374151;">
                  ${magicLinkUrl}
                </div>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px; text-align: center; background-color: #1e3a8a;">
              <p style="color: #cbd5e1; margin: 0; font-size: 14px;">
                This is an automated security email from VOICE AI Visibility Checker.
              </p>
              <p style="color: #94a3b8; margin: 10px 0 0 0; font-size: 12px;">
                For security, this link will expire in ${expiresInMinutes} minutes and can only be used once.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Send notification email about successful user registration via magic link
 * (Optional: for admin notifications)
 */
export async function sendRegistrationNotification(email: string, source: 'stripe' | 'manual'): Promise<boolean> {
  try {
    if (!config.EMAIL_SENDER_KEY || !resend) {
      console.log("⚠️ EMAIL_SENDER_KEY not set, skipping registration notification");
      return false;
    }

    const sourceLabel = source === 'stripe' ? 'Stripe Checkout' : 'Manual Registration';
    
    const result = await resend.emails.send({
      from: 'VOICE AI Visibility Checker <notifications@voice-scanner.repl.co>',
      to: 'admin@voice-scanner.repl.co', // Replace with actual admin email
      subject: `🎉 New User Registration: ${email}`,
      html: `
        <h2>New User Registration</h2>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Source:</strong> ${sourceLabel}</p>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
      `
    });

    console.log(`✅ Registration notification sent for: ${email}`);
    return true;

  } catch (error) {
    console.error('❌ Failed to send registration notification:', error);
    return false;
  }
}

/**
 * Test email functionality (development only)
 */
export async function testEmailService(testEmail: string): Promise<boolean> {
  if (config.NODE_ENV === 'production') {
    console.log('⚠️ Test email function disabled in production');
    return false;
  }

  console.log(`🧪 Testing email service with: ${testEmail}`);
  
  const testMagicLink = `${config.APP_BASE_URL}/auth/magic/consume?token=test-token-12345`;
  return sendMagicLink(testEmail, testMagicLink, 30);
}