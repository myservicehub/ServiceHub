import {
  Body,
  Button,
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

interface TradespersonWelcomeProps {
  tradespersonName?: string;
  completeRegistrationUrl?: string;
}

export const TradespersonWelcome = ({
  tradespersonName = '{{tradespersonName}}',
  completeRegistrationUrl = '{{completeRegistrationUrl}}',
}: TradespersonWelcomeProps) => (
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
    <Preview>You're almost ready to express interest in leads on ServiceHub</Preview>
    <Body style={main}>
      <Container style={container}>
        
        {/* Hero Section with Logo Centered on Image */}
        <Section style={heroSection}>
          <table cellPadding="0" cellSpacing="0" width="100%" style={heroTable}>
            <tr>
              <td align="center" valign="middle" style={heroTd}>
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
                        <span style={logoServiceWhite}>Service</span>
                        <span style={logoHubWhite}>Hub</span>
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
          <Heading style={h1}>You're almost ready to express interest in leads</Heading>
          
          <Text style={greeting}>Welcome!</Text>
          
          <Text style={paragraph}>
            You're a few steps away from being part of our network of tradespeople. 
            Before you can express interest in leads, you first need to complete your registration.
          </Text>
          
          {/* What's Next Card */}
          <table cellPadding="0" cellSpacing="0" style={whatsNextCard}>
            <tr>
              <td style={whatsNextHeader}>
                <Text style={whatsNextTitle}>What's next?</Text>
              </td>
            </tr>
            
            {/* Step 1: Sign up - Completed */}
            <tr>
              <td style={stepRow}>
                <table cellPadding="0" cellSpacing="0" width="100%">
                  <tr>
                    <td style={checkboxCell}>
                      <table cellPadding="0" cellSpacing="0" style={checkboxChecked}>
                        <tr>
                          <td align="center" valign="middle" style={{ color: '#ffffff', fontSize: '14px', fontWeight: 'bold' }}>
                            ✓
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td style={stepContent}>
                      <Text style={stepTitle}>Sign up</Text>
                      <Text style={stepDescription}>You've created an account.</Text>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            
            {/* Step 2: Complete registration - Pending */}
            <tr>
              <td style={stepRow}>
                <table cellPadding="0" cellSpacing="0" width="100%">
                  <tr>
                    <td style={checkboxCell}>
                      <table cellPadding="0" cellSpacing="0" style={checkboxUnchecked}>
                        <tr>
                          <td></td>
                        </tr>
                      </table>
                    </td>
                    <td style={stepContent}>
                      <Text style={stepTitle}>Complete registration</Text>
                      <Text style={stepDescription}>Once you're done, our team will verify and approve your application.</Text>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            
            {/* Step 3: Get the jobs you want - Pending */}
            <tr>
              <td style={{ ...stepRow, borderBottom: 'none' }}>
                <table cellPadding="0" cellSpacing="0" width="100%">
                  <tr>
                    <td style={checkboxCell}>
                      <table cellPadding="0" cellSpacing="0" style={checkboxUnchecked}>
                        <tr>
                          <td></td>
                        </tr>
                      </table>
                    </td>
                    <td style={stepContent}>
                      <Text style={stepTitle}>Get the jobs you want</Text>
                      <Text style={stepDescription}>As soon as you're approved you can start expressing interest.</Text>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          
          <Section style={buttonContainer}>
            <Button style={primaryButton} href={completeRegistrationUrl}>
              Complete registration
            </Button>
          </Section>
          
          <Hr style={divider} />
          
          <Text style={securityNote}>
            You're receiving this because you signed up as a tradesperson on ServiceHub.
          </Text>
        </Section>

        {/* Footer */}
        <Section style={footer}>
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
          
          <Text style={footerText}>© 2025 ServiceHub Limited. All rights reserved.</Text>
          <Text style={footerAddress}>6, D Place Guest House, Off Omimi Link Road, Ekpan, Delta State, Nigeria</Text>
          
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

export default TradespersonWelcome;

// Styles
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

const logoServiceWhite = { color: '#ffffff' };
const logoHubWhite = { color: '#dcfce7' };

const heroSection = { width: '100%' };

const heroTable = {
  width: '100%',
  height: '200px',
  backgroundImage: 'url(https://my-servicehub.vercel.app/stock/bg15.jpg)',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
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
  fontSize: '26px',
  fontWeight: '700',
  margin: '0 0 24px',
  textAlign: 'left' as const,
  letterSpacing: '-0.5px',
  lineHeight: '1.3',
};

const greeting = {
  color: '#374151',
  fontSize: '16px',
  fontWeight: '600',
  lineHeight: '1.6',
  margin: '0 0 12px',
};

const paragraph = {
  color: '#4b5563',
  fontSize: '15px',
  lineHeight: '1.7',
  margin: '0 0 28px',
};

const whatsNextCard = {
  width: '100%',
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  marginBottom: '28px',
};

const whatsNextHeader = {
  padding: '20px 20px 16px',
  borderBottom: '1px solid #e5e7eb',
};

const whatsNextTitle = {
  color: '#0a1b3d',
  fontSize: '18px',
  fontWeight: '700',
  margin: '0',
};

const stepRow = {
  padding: '16px 20px',
  borderBottom: '1px solid #f3f4f6',
};

const checkboxCell = {
  width: '32px',
  verticalAlign: 'top' as const,
  paddingTop: '2px',
};

const checkboxChecked = {
  width: '22px',
  height: '22px',
  backgroundColor: '#34D164',
  borderRadius: '4px',
};

const checkboxUnchecked = {
  width: '22px',
  height: '22px',
  backgroundColor: '#ffffff',
  border: '2px solid #d1d5db',
  borderRadius: '4px',
};

const stepContent = {
  paddingLeft: '12px',
  verticalAlign: 'top' as const,
};

const stepTitle = {
  color: '#0a1b3d',
  fontSize: '15px',
  fontWeight: '600',
  margin: '0 0 4px',
};

const stepDescription = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '0',
  lineHeight: '1.5',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '0 0 28px',
};

const primaryButton = {
  backgroundColor: '#34D164',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
};

const divider = {
  borderColor: '#e5e7eb',
  margin: '24px 0',
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

const footerLogoText = { fontSize: '18px', fontWeight: '700', margin: '0' };
const footerLogoService = { color: '#ffffff' };
const footerLogoHub = { color: '#34D164' };
const footerNav = { textAlign: 'center' as const };
const footerNavLink = { color: '#9ca3af', fontSize: '13px', textDecoration: 'none', margin: '0 12px' };
const socialRow = { textAlign: 'center' as const };
const socialIconLink = { display: 'inline-block', margin: '0 10px', textDecoration: 'none' };
const socialIcon = { borderRadius: '4px' };
const footerText = { color: '#6b7280', fontSize: '12px', margin: '0 0 8px', textAlign: 'center' as const };
const footerAddress = { color: '#4b5563', fontSize: '11px', margin: '0', textAlign: 'center' as const };
const footerLegalLink = { color: '#6b7280', fontSize: '12px', textDecoration: 'none' };
const footerLegalDivider = { color: '#4b5563', margin: '0 8px' };
