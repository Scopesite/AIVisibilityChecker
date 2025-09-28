import { Resend } from 'resend';

const resend = new Resend(process.env.EMAIL_API_KEY);

interface AnalysisResult {
  email: string;
  website_url: string;
  score: number;
  zone: 'RED' | 'AMBER' | 'GREEN';
  schema_types: string;
  recommendation_1?: string;
  recommendation_2?: string;
  recommendation_3?: string;
  recommendation_4?: string;
  checked_at: string;
}

export async function sendAnalysisResultEmail(result: AnalysisResult): Promise<boolean> {
  try {
    if (!process.env.EMAIL_API_KEY) {
      console.log("⚠️ EMAIL_API_KEY not set, skipping email");
      return false;
    }

    const zoneColor = result.zone === 'GREEN' ? '#16a34a' : 
                     result.zone === 'AMBER' ? '#f59e0b' : '#dc2626';
    
    const zoneName = result.zone === 'GREEN' ? 'Advanced Implementation' :
                    result.zone === 'AMBER' ? 'Good Start, Room for Growth' :
                    'Needs Immediate Attention';

    const ctaMessage = result.score <= 30 ? 
      "Your schema markup needs immediate attention. This means massive untapped potential for AI visibility." :
      result.score <= 65 ?
      "You've got the basics covered, but there are significant gaps. Let's optimize what you have and add what's missing." :
      "Impressive schema setup! You understand AI visibility. Let's explore partnership opportunities for advanced services.";

    const recommendations = [
      result.recommendation_1,
      result.recommendation_2,
      result.recommendation_3,
      result.recommendation_4
    ].filter(Boolean);

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your AI Visibility Analysis</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1e3a8a; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 30px; text-align: center; background-color: #1e3a8a;">
              <h1 style="color: #fbbf24; margin: 0; font-size: 24px; font-weight: bold;">🎯 AI VISIBILITY ANALYSIS COMPLETE</h1>
              <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px;">BULL$#!T Free Schema Markup Assessment</p>
            </td>
          </tr>
          
          <!-- Score Section -->
          <tr>
            <td style="padding: 40px; text-align: center; background-color: #ffffff;">
              <div style="background-color: #1e3a8a; border-radius: 8px; padding: 30px; margin-bottom: 30px;">
                <h2 style="color: #fbbf24; margin: 0 0 10px 0; font-size: 18px;">Your AI Visibility Score</h2>
                <div style="font-size: 48px; font-weight: bold; color: ${zoneColor}; margin: 10px 0;">${result.score}/100</div>
                <div style="color: #ffffff; font-size: 16px; font-weight: bold;">${zoneName}</div>
                <div style="color: #cbd5e1; font-size: 14px; margin-top: 10px;">${result.website_url}</div>
              </div>
              
              <div style="text-align: left; margin-bottom: 30px;">
                <h3 style="color: #1e3a8a; font-size: 18px; margin-bottom: 15px;">📊 Analysis Summary</h3>
                <p style="color: #64748b; line-height: 1.6; margin-bottom: 10px;"><strong>Schemas Detected:</strong> ${result.schema_types}</p>
                <p style="color: #64748b; line-height: 1.6; margin: 0;"><strong>Analysis Date:</strong> ${new Date(result.checked_at).toLocaleDateString()}</p>
              </div>
              
              ${recommendations.length > 0 ? `
              <div style="text-align: left; margin-bottom: 30px;">
                <h3 style="color: #1e3a8a; font-size: 18px; margin-bottom: 15px;">🎯 TACTICAL RECOMMENDATIONS</h3>
                ${recommendations.map((rec, index) => `
                  <div style="background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 6px; padding: 15px; margin-bottom: 10px;">
                    <strong style="color: #92400e;">Action ${index + 1}:</strong>
                    <span style="color: #451a03; line-height: 1.5;">${rec}</span>
                  </div>
                `).join('')}
              </div>
              ` : ''}
              
              <div style="background-color: #1e3a8a; border-radius: 8px; padding: 25px; text-align: center;">
                <h3 style="color: #fbbf24; margin: 0 0 15px 0; font-size: 18px;">📈 NEXT STEPS</h3>
                <p style="color: #ffffff; line-height: 1.6; margin-bottom: 20px;">${ctaMessage}</p>
                <a href="https://www.scopesite.co.uk/strategy-meeting-uk-web-design" style="display: inline-block; background-color: #fbbf24; color: #000000; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">📞 BOOK FREE STRATEGY SESSION</a>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px; text-align: center; background-color: #1e3a8a;">
              <p style="color: #cbd5e1; margin: 0; font-size: 14px;">
                Based on your score, we recommend ${result.score <= 30 ? 'immediate action' : result.score <= 65 ? 'strategic optimization' : 'exploring advanced partnership opportunities'} to maximize your AI visibility.
              </p>
              <p style="color: #94a3b8; margin: 10px 0 0 0; font-size: 12px;">
                Powered by Scopesite | Veteran-Owned Web Design Agency
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const userEmailResult = await resend.emails.send({
      from: 'AI Visibility Checker <ai-visibility-score@scopesite.co.uk>',
      to: result.email,
      subject: `🎯 Your AI Visibility Score: ${result.score}/100 (${result.zone} Zone)`,
      html: emailHtml
    });

    console.log("📧 Analysis result email sent to:", result.email);
    return true;
  } catch (error) {
    console.log("❌ Failed to send analysis email:", error);
    return false;
  }
}

export async function sendLeadNotificationEmail(result: AnalysisResult): Promise<boolean> {
  try {
    if (!process.env.EMAIL_API_KEY) {
      console.log("⚠️ EMAIL_API_KEY not set, skipping lead notification");
      return false;
    }

    const leadQuality = result.score <= 30 ? '🔥 HIGH-PRIORITY LEAD' :
                       result.score <= 65 ? '⚡ QUALIFIED PROSPECT' :
                       '💎 PARTNERSHIP OPPORTUNITY';

    const leadHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New AI Visibility Lead</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1e3a8a; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="padding: 30px; text-align: center; background-color: #1e3a8a;">
              <h1 style="color: #fbbf24; margin: 0; font-size: 24px; font-weight: bold;">${leadQuality}</h1>
              <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px;">New AI Visibility Checker Submission</p>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 30px; background-color: #ffffff;">
              <h3 style="color: #1e3a8a; margin: 0 0 20px 0;">📋 Lead Details</h3>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                <tr>
                  <td style="padding: 10px; background-color: #f8fafc; border-left: 4px solid #fbbf24; font-weight: bold; width: 30%;">Email:</td>
                  <td style="padding: 10px; background-color: #f8fafc;">${result.email}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; background-color: #ffffff; border-left: 4px solid #fbbf24; font-weight: bold;">Website:</td>
                  <td style="padding: 10px; background-color: #ffffff;"><a href="${result.website_url}" style="color: #1e3a8a;">${result.website_url}</a></td>
                </tr>
                <tr>
                  <td style="padding: 10px; background-color: #f8fafc; border-left: 4px solid #fbbf24; font-weight: bold;">Score:</td>
                  <td style="padding: 10px; background-color: #f8fafc; font-size: 18px; font-weight: bold; color: ${result.zone === 'GREEN' ? '#16a34a' : result.zone === 'AMBER' ? '#f59e0b' : '#dc2626'};">${result.score}/100 (${result.zone} Zone)</td>
                </tr>
                <tr>
                  <td style="padding: 10px; background-color: #ffffff; border-left: 4px solid #fbbf24; font-weight: bold;">Schemas:</td>
                  <td style="padding: 10px; background-color: #ffffff;">${result.schema_types}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; background-color: #f8fafc; border-left: 4px solid #fbbf24; font-weight: bold;">Submitted:</td>
                  <td style="padding: 10px; background-color: #f8fafc;">${new Date(result.checked_at).toLocaleString()}</td>
                </tr>
              </table>
              
              <div style="background-color: ${result.score <= 30 ? '#fef2f2' : result.score <= 65 ? '#fefbf2' : '#f0fdf4'}; border: 1px solid ${result.score <= 30 ? '#fca5a5' : result.score <= 65 ? '#fbbf24' : '#86efac'}; border-radius: 6px; padding: 20px; margin-bottom: 20px;">
                <h4 style="margin: 0 0 10px 0; color: #1e3a8a;">💼 Lead Quality Assessment</h4>
                <p style="margin: 0; line-height: 1.6; color: #374151;">
                  ${result.score <= 30 ? 
                    'HIGH-PRIORITY LEAD: Minimal schema implementation suggests this prospect needs immediate help and represents significant revenue potential.' :
                    result.score <= 65 ?
                    'QUALIFIED PROSPECT: Partial implementation shows they understand value but need optimization. Good conversion potential.' :
                    'PARTNERSHIP OPPORTUNITY: Advanced implementation indicates sophisticated understanding. Potential for high-value services or partnerships.'
                  }
                </p>
              </div>
              
              <div style="text-align: center;">
                <a href="mailto:${result.email}?subject=AI Visibility Analysis Follow-up&body=Hi there,%0D%0A%0D%0AI saw you ran our AI Visibility Checker for ${encodeURIComponent(result.website_url)} and got a score of ${result.score}/100.%0D%0A%0D%0ABased on your results, I'd love to discuss how we can help improve your AI visibility..." style="display: inline-block; background-color: #fbbf24; color: #000000; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-right: 10px;">📧 Email Lead</a>
                <a href="https://www.scopesite.co.uk/strategy-meeting-uk-web-design" style="display: inline-block; background-color: #1e3a8a; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">📞 Book Meeting</a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const leadEmailResult = await resend.emails.send({
      from: 'AI Visibility Checker <book-free-consultation@scopesite.co.uk>',
      to: 'dan@scopesite.co.uk',
      subject: `${leadQuality}: ${result.email} - ${result.score}/100 Score`,
      html: leadHtml
    });

    console.log("📧 Lead notification sent to: dan@scopesite.co.uk");
    return true;
  } catch (error) {
    console.log("❌ Failed to send lead notification:", error);
    return false;
  }
}