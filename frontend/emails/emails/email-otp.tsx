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

interface EmailOtpProps {
  name?: string;
  otpCode?: string;
}

export const EmailOtp = ({
  name = 'John',
  otpCode = '847291',
}: EmailOtpProps) => (
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
    <Preview>Your ServiceHub verification code is {otpCode}</Preview>
    <Body style={main}>
      <Container style={container}>
        
        {/* Hero Section with Logo Centered on Image */}
        <Section style={heroSection}>
          <table cellPadding="0" cellSpacing="0" width="100%" style={heroTable}>
            <tr>
              <td align="center" valign="middle" style={heroTd}>
                {/* Logo Container */}
                <table cellPadding="0" cellSpacing="0" style={logoContainer}>
                  <tr>
                    <td style={{ verticalAlign: 'middle', paddingRight: '10px' }}>
                      <Img
                        src="https://my-servicehub.vercel.app/Logo-Icon-Green.png"
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

        {/* Main Content */}
        <Section style={contentSection}>
          <Heading style={h1}>Verification code</Heading>
          
          <Text style={greeting}>Hello {name},</Text>
          
          <Text style={paragraph}>
            Use the code below to complete your action on ServiceHub.
          </Text>
          
          {/* OTP Code Display - Individual Digit Boxes */}
          <table cellPadding="0" cellSpacing="0" style={{ width: '100%', margin: '28px 0' }}>
            <tr>
              <td style={{ textAlign: 'center' as const }}>
                <table cellPadding="0" cellSpacing="8" style={{ margin: '0 auto' }}>
                  <tr>
                    {otpCode.split('').map((digit, index) => (
                      <td key={index} style={otpDigitBox}>
                        <Text style={otpDigitText}>{digit}</Text>
                      </td>
                    ))}
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          
          <Hr style={divider} />
          
          <Text style={expiryText}>
            This code expires in 10 minutes.
          </Text>
          
          <Text style={securityNote}>
            If you didn't request this code, you can safely ignore this email.
          </Text>
        </Section>

        {/* Footer - matching website style */}
        <Section style={footer}>
          {/* Logo */}
          <table cellPadding="0" cellSpacing="0" style={{ width: '100%', marginBottom: '24px' }}>
            <tr>
              <td style={{ textAlign: 'center' as const }}>
                <table cellPadding="0" cellSpacing="0" style={{ margin: '0 auto' }}>
                  <tr>
                    <td style={{ verticalAlign: 'middle', paddingRight: '8px' }}>
                      <Img
                        src="https://my-servicehub.vercel.app/Logo-Icon-Green.png"
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
          
          {/* Navigation */}
          <table cellPadding="0" cellSpacing="0" style={{ width: '100%', marginBottom: '24px' }}>
            <tr>
              <td style={footerNav}>
                <Link href="https://myservicehub.co/about" style={footerNavLink}>About us</Link>
                <Link href="https://myservicehub.co/how-it-works" style={footerNavLink}>How it works</Link>
                <Link href="https://myservicehub.co/find-trades" style={footerNavLink}>Find trades</Link>
              </td>
            </tr>
          </table>
          
          {/* Social Icons */}
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
          
          {/* Copyright */}
          <Text style={footerText}>
            © 2025 ServiceHub Limited. All rights reserved.
          </Text>
          <Text style={footerAddress}>
            6, D Place Guest House, Off Omimi Link Road, Ekpan, Delta State, Nigeria
          </Text>
          
          {/* Legal Links */}
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

export default EmailOtp;

// Styles - ServiceHub Brand Colors
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

const header = {
  padding: '24px 32px',
  backgroundColor: '#ffffff',
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
  backgroundImage: 'url(https://my-servicehub.vercel.app/stock/bg2.jpeg)',
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
  margin: '0 0 24px',
};

const otpDigitBox = {
  width: '48px',
  height: '56px',
  backgroundColor: '#f3f4f6',
  borderRadius: '10px',
  textAlign: 'center' as const,
  verticalAlign: 'middle' as const,
};

const otpDigitText = {
  fontSize: '28px',
  fontWeight: '700',
  color: '#0a1b3d',
  margin: '0',
  lineHeight: '56px',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const copyCodeContainer = {
  backgroundColor: '#f3f4f6',
  borderRadius: '8px',
  padding: '12px 24px',
  border: '1px dashed #d1d5db',
};

const copyCodeText = {
  fontSize: '24px',
  fontWeight: '700',
  color: '#0a1b3d',
  margin: '0',
  letterSpacing: '8px',
  fontFamily: 'monospace, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const copyHintText = {
  fontSize: '13px',
  color: '#6b7280',
  margin: '12px 0 0',
};

const divider = {
  borderColor: '#e5e7eb',
  margin: '24px 0',
};

const expiryText = {
  color: '#6b7280',
  fontSize: '14px',
  textAlign: 'center' as const,
  margin: '0 0 12px',
};

const securityNote = {
  color: '#9ca3af',
  fontSize: '13px',
  textAlign: 'center' as const,
  margin: '0',
};

const footer = {
  backgroundColor: '#0a1b3d',
  padding: '32px',
  textAlign: 'center' as const,
};

const footerLogoText = {
  fontSize: '18px',
  fontWeight: '700',
  margin: '0',
};

const footerLogoService = {
  color: '#ffffff',
};

const footerLogoHub = {
  color: '#34D164',
};

const footerNav = {
  textAlign: 'center' as const,
};

const footerNavLink = {
  color: '#9ca3af',
  fontSize: '13px',
  textDecoration: 'none',
  margin: '0 12px',
};

const socialRow = {
  textAlign: 'center' as const,
};

const socialIconLink = {
  display: 'inline-block',
  margin: '0 10px',
  textDecoration: 'none',
};

const socialIcon = {
  borderRadius: '4px',
};

const footerText = {
  color: '#6b7280',
  fontSize: '12px',
  margin: '0 0 8px',
  textAlign: 'center' as const,
};

const footerAddress = {
  color: '#4b5563',
  fontSize: '11px',
  margin: '0',
  textAlign: 'center' as const,
};

const footerLegalLink = {
  color: '#6b7280',
  fontSize: '12px',
  textDecoration: 'none',
};

const footerLegalDivider = {
  color: '#4b5563',
  margin: '0 8px',
};
