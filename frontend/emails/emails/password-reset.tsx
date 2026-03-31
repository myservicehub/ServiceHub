import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface PasswordResetProps {
  name?: string;
  resetLink?: string;
}

const assetsBaseUrl = 'https://www.myservicehub.co';

export const PasswordReset = ({
  name = 'John',
  resetLink = 'https://myservicehub.co/reset-password?token=example',
}: PasswordResetProps) => (
  <Html>
    <Head>
      <meta name="color-scheme" content="light only" />
      <meta name="supported-color-schemes" content="light only" />
      <style>{`
        :root { color-scheme: light only; }
        @media (prefers-color-scheme: dark) {
          .email-body, .email-container, .content-section, .footer-section {
            background-color: #ffffff !important;
          }
          .heading-text, .body-text {
            color: #0a1b3d !important;
          }
        }
      `}</style>
    </Head>
    <Preview>Reset your ServiceHub password</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={heroSection}>
          <table cellPadding="0" cellSpacing="0" width="100%" style={heroTable}>
            <tr>
              <td align="center" valign="middle" style={heroTd}>
                <table cellPadding="0" cellSpacing="0" style={logoContainer}>
                  <tr>
                    <td style={{ verticalAlign: 'middle', paddingRight: '10px' }}>
                      <Img
                        src={`${assetsBaseUrl}/Logo-Icon-Green.png`}
                        width="40"
                        height="40"
                        alt="ServiceHub"
                      />
                    </td>
                    <td style={{ verticalAlign: 'middle' }}>
                      <Text style={logoText}>
                        <span style={logoService}>Service</span>
                        <span style={logoHub}>Hub</span>
                      </Text>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </Section>

        <Section style={contentSection}>
          <Heading style={h1}>Reset your password</Heading>

          <Text style={greeting}>Hello {name},</Text>

          <Text style={paragraph}>
            We received a request to reset the password for your ServiceHub account.
            If you made this request, use the button below to choose a new password.
          </Text>

          <table cellPadding="0" cellSpacing="0" style={{ width: '100%', margin: '24px 0' }}>
            <tr>
              <td style={{ textAlign: 'center' as const }}>
                <Link
                  href={resetLink}
                  style={resetButton}
                >
                  Reset password
                </Link>
              </td>
            </tr>
          </table>

          <Text style={paragraphSmall}>
            If the button does not work, copy and paste this link into your browser:
          </Text>
          <Text style={resetLinkText}>{resetLink}</Text>

          <Hr style={divider} />

          <Text style={warningText}>
            This link will expire in 1 hour for security reasons. If you did not request a
            password reset, you can safely ignore this email and your password will remain
            unchanged.
          </Text>
        </Section>

        <Section style={footer}>
          <table cellPadding="0" cellSpacing="0" style={{ width: '100%', marginBottom: '24px' }}>
            <tr>
              <td style={{ textAlign: 'center' as const }}>
                <table cellPadding="0" cellSpacing="0" style={{ margin: '0 auto' }}>
                  <tr>
                    <td style={{ verticalAlign: 'middle', paddingRight: '8px' }}>
                      <Img
                        src={`${assetsBaseUrl}/Logo-Icon-Green.png`}
                        width="28"
                        height="28"
                        alt="ServiceHub"
                      />
                    </td>
                    <td style={{ verticalAlign: 'middle' }}>
                      <Text style={footerLogoText}>
                        <span style={footerLogoService}>Service</span>
                        <span style={footerLogoHub}>Hub</span>
                      </Text>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <table cellPadding="0" cellSpacing="0" style={{ width: '100%', marginBottom: '24px' }}>
            <tr>
              <td style={footerNav}>
                <Link href="https://myservicehub.co/about" style={footerNavLink}>About us</Link>
                <Link href="https://myservicehub.co/how-it-works" style={footerNavLink}>How it works</Link>
                <Link href="https://myservicehub.co/find-trades" style={footerNavLink}>Find trades</Link>
              </td>
            </tr>
          </table>

          <table cellPadding="0" cellSpacing="0" style={{ width: '100%', marginBottom: '24px' }}>
            <tr>
              <td style={socialRow}>
                <Link href="https://twitter.com/servicehubng" style={socialIconLink}>
                  <Img src="https://cdn-icons-png.flaticon.com/512/5968/5968958.png" width="22" height="22" alt="X" style={socialIcon} />
                </Link>
                <Link href="https://facebook.com/servicehubng" style={socialIconLink}>
                  <Img src="https://cdn-icons-png.flaticon.com/512/5968/5968764.png" width="22" height="22" alt="Facebook" style={socialIcon} />
                </Link>
                <Link href="https://instagram.com/servicehubng" style={socialIconLink}>
                  <Img src="https://cdn-icons-png.flaticon.com/512/2111/2111463.png" width="22" height="22" alt="Instagram" style={socialIcon} />
                </Link>
                <Link href="https://youtube.com/@servicehubng" style={socialIconLink}>
                  <Img src="https://cdn-icons-png.flaticon.com/512/1384/1384060.png" width="22" height="22" alt="YouTube" style={socialIcon} />
                </Link>
              </td>
            </tr>
          </table>

          <Text style={footerText}>
            © 2025 ServiceHub Limited. All rights reserved.
          </Text>
          <Text style={footerAddress}>
            6, D Place Guest House, Off Omimi Link Road, Ekpan, Delta State, Nigeria
          </Text>

          <table cellPadding="0" cellSpacing="0" style={{ width: '100%', marginTop: '16px' }}>
            <tr>
              <td style={{ textAlign: 'center' as const }}>
                <Link href="https://myservicehub.co/privacy" style={footerLegalLink}>Privacy Policy</Link>
                <span style={footerLegalDivider}>•</span>
                <Link href="https://myservicehub.co/terms" style={footerLegalLink}>Terms of Service</Link>
              </td>
            </tr>
          </table>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default PasswordReset;

const main = {
  backgroundColor: '#f8f9fa',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  padding: '40px 0',
};

const container = {
  margin: '0 auto',
  maxWidth: '600px',
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  overflow: 'hidden',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
};

const logoText = {
  fontSize: '20px',
  fontWeight: '700',
  margin: '0',
  letterSpacing: '-0.5px',
};

const logoService = {
  color: '#0a1b3d',
};

const logoHub = {
  color: '#34D164',
};

const heroSection = {
  width: '100%',
};

const heroTable = {
  width: '100%',
  height: '200px',
  backgroundImage: 'url(https://www.myservicehub.co/stock/bg2.jpeg)',
  backgroundSize: 'cover',
  backgroundPosition: 'bottom',
  backgroundRepeat: 'no-repeat',
};

const heroTd = {
  height: '200px',
  textAlign: 'center' as const,
  verticalAlign: 'middle' as const,
};

const logoContainer = {
  borderRadius: '12px',
  padding: '16px 28px',
};

const contentSection = {
  padding: '40px 32px',
  backgroundColor: '#ffffff',
};

const h1 = {
  color: '#0a1b3d',
  fontSize: '28px',
  fontWeight: '700',
  margin: '0 0 24px',
  textAlign: 'center' as const,
  letterSpacing: '-0.5px',
};

const greeting = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 16px',
};

const paragraph = {
  color: '#4b5563',
  fontSize: '15px',
  lineHeight: '1.7',
  margin: '0 0 20px',
};

const paragraphSmall = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0 0 8px',
};

const resetButton = {
  display: 'inline-block',
  padding: '14px 28px',
  borderRadius: '999px',
  backgroundColor: '#34D164',
  color: '#ffffff',
  fontWeight: 600,
  fontSize: '16px',
  textDecoration: 'none',
};

const resetLinkText = {
  wordBreak: 'break-all' as const,
  color: '#6b7280',
  fontSize: '12px',
  lineHeight: '1.6',
  margin: '0 0 20px',
};

const divider = {
  borderColor: '#e5e7eb',
  margin: '24px 0',
};

const warningText = {
  color: '#b45309',
  fontSize: '13px',
  lineHeight: '1.6',
};

const footer = {
  padding: '32px',
  backgroundColor: '#f9fafb',
};

const footerLogoText = {
  fontSize: '18px',
  fontWeight: '700',
  margin: '0',
  letterSpacing: '-0.5px',
};

const footerLogoService = {
  color: '#0a1b3d',
};

const footerLogoHub = {
  color: '#34D164',
};

const footerNav = {
  textAlign: 'center' as const,
};

const footerNavLink = {
  margin: '0 8px',
  fontSize: '13px',
  color: '#4b5563',
  textDecoration: 'none',
};

const socialRow = {
  textAlign: 'center' as const,
};

const socialIconLink = {
  margin: '0 6px',
};

const socialIcon = {
  borderRadius: '999px',
};

const footerText = {
  fontSize: '12px',
  color: '#6b7280',
  textAlign: 'center' as const,
  margin: '0 0 4px',
};

const footerAddress = {
  fontSize: '12px',
  color: '#9ca3af',
  textAlign: 'center' as const,
  margin: '0',
};

const footerLegalLink = {
  fontSize: '12px',
  color: '#9ca3af',
  textDecoration: 'none',
  margin: '0 4px',
};

const footerLegalDivider = {
  color: '#9ca3af',
  margin: '0 4px',
};
