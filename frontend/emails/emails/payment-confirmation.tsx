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
  Button
} from '@react-email/components';
import * as React from 'react';

interface PaymentConfirmationProps {
  tradespersonName?: string;
  jobId?: string;
  jobTitle?: string;
  jobLocation?: string;
  homeownerName?: string;
  homeownerEmail?: string;
  homeownerPhone?: string;
}

export const PaymentConfirmation = ({
  tradespersonName = 'Michael',
  jobId = 'JOB-2025-001',
  jobTitle = 'Kitchen Renovation',
  jobLocation = 'Lagos, Nigeria',
  homeownerName = 'John Doe',
  homeownerEmail = 'john@example.com',
  homeownerPhone = '+234 801 234 5678',
}: PaymentConfirmationProps) => (
  <Html>
    <Head>
      <meta name="color-scheme" content="light only" />
      <meta name="supported-color-schemes" content="light only" />
    </Head>
    <Preview>Payment confirmed! Here are the contact details for {jobTitle}</Preview>
    <Body style={main}>
      <Container style={container}>
        
        <Section style={heroSection}>
          <table cellPadding="0" cellSpacing="0" width="100%" style={heroTable}>
            <tr>
              <td align="center" valign="middle" style={heroTd}>
                <table cellPadding="0" cellSpacing="0" style={logoContainer}>
                  <tr>
                    <td style={{ verticalAlign: 'middle', paddingRight: '10px' }}>
                      <Img src="https://my-servicehub.vercel.app/Logo-Icon-Green.png" width="40" height="40" alt="ServiceHub" />
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

        <Section style={contentSection}>
          <table cellPadding="0" cellSpacing="0" style={{ width: '100%', marginBottom: '24px' }}>
            <tr>
              <td align="center" style={{ textAlign: 'center' }}>
                <table cellPadding="0" cellSpacing="0" style={{ margin: '0 auto' }}>
                  <tr>
                    <td style={{ verticalAlign: 'middle', paddingRight: '12px', lineHeight: '0' }}>
                      <Img src="https://cdn-icons-png.flaticon.com/512/5610/5610944.png" width="32" height="32" alt="" style={{ display: 'block' }} />
                    </td>
                    <td style={{ verticalAlign: 'middle' }}>
                      <Text style={{ ...h1, margin: '0', lineHeight: '1' }}>Payment Confirmed!</Text>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          
          <Text style={greeting}>Hello {tradespersonName},</Text>
          
          <Text style={paragraph}>
            Your payment of <strong>₦1,000</strong> has been confirmed. You now have 
            full access to the homeowner's contact details.
          </Text>
          
          <table cellPadding="0" cellSpacing="0" style={contactCard}>
            <tr>
              <td style={contactCardHeader}>
                <Text style={contactCardTitle}>Contact Details</Text>
              </td>
            </tr>
            <tr>
              <td style={contactCardBody}>
                <table cellPadding="0" cellSpacing="0" style={{ width: '100%' }}>
                  <tr>
                    <td style={contactRow}>
                      <Text style={contactLabel}>Job <span style={{ color: '#6b7280', fontWeight: '400' }}>#{jobId}</span></Text>
                      <Text style={contactValue}>{jobTitle}</Text>
                    </td>
                  </tr>
                  <tr>
                    <td style={contactRow}>
                      <Text style={contactLabel}>Location</Text>
                      <Text style={contactValue}>{jobLocation}</Text>
                    </td>
                  </tr>
                  <tr>
                    <td style={contactRow}>
                      <Text style={contactLabel}>Homeowner</Text>
                      <Text style={contactValue}>{homeownerName}</Text>
                    </td>
                  </tr>
                  {/* <tr>
                    <td style={contactRow}>
                      <Text style={contactLabel}>Email</Text>
                      <Text style={contactValueLink}>{homeownerEmail}</Text>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ ...contactRow, borderBottom: 'none' }}>
                      <Text style={contactLabel}>Phone</Text>
                      <Text style={contactValueLink}>{homeownerPhone}</Text>
                    </td>
                  </tr> */}
                </table>
              </td>
            </tr>
          </table>
          

          <Section style={buttonContainer}>
              <Button style={primaryButton} href={''}>
                Chat with {homeownerName}
              </Button>
            </Section>

          <Text style={paragraph}>
            You can now contact the homeowner directly to discuss the job details 
            and arrange a meeting.
          </Text>
          
          <Text style={successNote}>
            Best of luck with your project!
          </Text>
          
          <Hr style={divider} />
          
          <Text style={securityNote}>
            You're receiving this because you made a payment on ServiceHub.
          </Text>
        </Section>

        <Section style={footer}>
          <table cellPadding="0" cellSpacing="0" style={{ width: '100%', marginBottom: '24px' }}>
            <tr>
              <td style={{ textAlign: 'center' as const }}>
                <table cellPadding="0" cellSpacing="0" style={{ margin: '0 auto' }}>
                  <tr>
                    <td style={{ verticalAlign: 'middle', paddingRight: '8px' }}>
                      <Img src="https://my-servicehub.vercel.app/Logo-Icon-Green.png" width="28" height="28" alt="ServiceHub" />
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

export default PaymentConfirmation;


const buttonContainer = { textAlign: 'center' as const, margin: '28px 0' };
const primaryButton = { backgroundColor: '#34D164', borderRadius: '8px', color: '#ffffff', fontSize: '15px', fontWeight: '600', textDecoration: 'none', textAlign: 'center' as const, display: 'inline-block', padding: '14px 32px' };

const main = { backgroundColor: '#f8f9fa', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', padding: '40px 0' };
const container = { margin: '0 auto', maxWidth: '600px', backgroundColor: '#ffffff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)' };
const logoText = { fontSize: '20px', fontWeight: '700', margin: '0', letterSpacing: '-0.5px' };
const logoServiceWhite = { color: '#ffffff' };
const logoHubWhite = { color: '#dcfce7' };
const heroSection = { width: '100%' };
const heroTable = { width: '100%', height: '200px', backgroundImage: 'url(https://my-servicehub.vercel.app/stock/bg5.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' };
const heroTd = { height: '200px', textAlign: 'center' as const, verticalAlign: 'middle' as const };
const logoContainer = { borderRadius: '12px', padding: '16px 28px' };
const contentSection = { padding: '40px 32px', backgroundColor: '#ffffff' };
const h1 = { color: '#0a1b3d', fontSize: '28px', fontWeight: '700', margin: '0 0 24px', textAlign: 'center' as const, letterSpacing: '-0.5px' };
const greeting = { color: '#374151', fontSize: '16px', lineHeight: '1.6', margin: '0 0 16px' };
const paragraph = { color: '#4b5563', fontSize: '15px', lineHeight: '1.7', margin: '0 0 24px' };
const contactCard = { width: '100%', border: '2px dashed #34D164', borderRadius: '10px', marginBottom: '24px', overflow: 'hidden' };
const contactCardHeader = { backgroundColor: '#f0fdf4', padding: '12px 16px', borderBottom: '1px solid #dcfce7' };
const contactCardTitle = { color: '#16a34a', fontSize: '14px', fontWeight: '600', margin: '0' };
const contactCardBody = { padding: '4px 0' };
const contactRow = { padding: '10px 16px', borderBottom: '1px solid #f3f4f6' };
const contactLabel = { color: '#6b7280', fontSize: '12px', margin: '0 0 2px' };
const contactValue = { color: '#0a1b3d', fontSize: '15px', fontWeight: '600', margin: '0' };
const contactValueLink = { color: '#34D164', fontSize: '15px', fontWeight: '600', margin: '0' };
const successNote = { color: '#16a34a', fontSize: '16px', fontWeight: '600', textAlign: 'center' as const, margin: '0 0 24px' };
const divider = { borderColor: '#e5e7eb', margin: '24px 0' };
const securityNote = { color: '#9ca3af', fontSize: '13px', textAlign: 'center' as const, margin: '0' };
const footer = { backgroundColor: '#0a1b3d', padding: '32px', textAlign: 'center' as const };
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
