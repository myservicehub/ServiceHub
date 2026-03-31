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

interface ExternalReviewInvitationProps {
  clientName?: string;
  tradespersonName?: string;
  jobId?: string;
  jobTitle?: string;
  reviewUrl?: string;
}

export const ExternalReviewInvitation = ({
  clientName = 'Sarah',
  tradespersonName = 'Michael Okonkwo',
  jobId = 'JOB-2025-001',
  jobTitle = 'Kitchen Renovation',
  reviewUrl = 'https://myservicehub.co/external-review/123',
}: ExternalReviewInvitationProps) => (
  <Html>
    <Head>
      <meta name="color-scheme" content="light only" />
      <meta name="supported-color-schemes" content="light only" />
    </Head>
    <Preview>{tradespersonName} has invited you to leave a review</Preview>
    <Body style={main}>
      <Container style={container}>
        
        <Section style={heroSection}>
          <table cellPadding="0" cellSpacing="0" width="100%" style={heroTable}>
            <tr>
              <td align="center" valign="middle" style={heroTd}>
                <table cellPadding="0" cellSpacing="0" style={logoContainer}>
                  <tr>
                    <td style={{ verticalAlign: 'middle', paddingRight: '10px' }}>
                      <Img src="https://www.myservicehub.co/Logo-Icon-Green.png" width="40" height="40" alt="ServiceHub" />
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
                      <Img src="https://cdn-icons-png.flaticon.com/512/1827/1827933.png" width="32" height="32" alt="" style={{ display: 'block' }} />
                    </td>
                    <td style={{ verticalAlign: 'middle' }}>
                      <Text style={{ ...h1, margin: '0', lineHeight: '1' }}>Review Request</Text>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          
          <Text style={greeting}>Hello {clientName},</Text>
          
          <Text style={paragraph}>
            <strong>{tradespersonName}</strong> has invited you to leave a review 
            for the work they recently completed for you.
          </Text>
          
          <table cellPadding="0" cellSpacing="0" style={jobBox}>
            <tr>
              <td style={jobBoxInner}>
                <Text style={jobLabel}>📋 Job: <span style={{ color: '#6b7280', fontWeight: '400' }}>#{jobId}</span></Text>
                <Text style={jobValue}>{jobTitle}</Text>
              </td>
            </tr>
          </table>
          
          <Text style={paragraph}>
            Reviews help professionals like {tradespersonName} build their reputation 
            and help other clients find reliable services. It only takes a minute 
            to share your experience!
          </Text>
          
          <Section style={buttonContainer}>
            <Button style={primaryButton} href={reviewUrl}>
              Leave Your Review
            </Button>
          </Section>
          
          <Text style={thankYouText}>
            Thank you for your feedback!
          </Text>
          
          <Hr style={divider} />
          
          <Text style={securityNote}>
            You're receiving this invitation from {tradespersonName} via ServiceHub.
          </Text>
        </Section>

        <Section style={footer}>
          <table cellPadding="0" cellSpacing="0" style={{ width: '100%', marginBottom: '24px' }}>
            <tr>
              <td style={{ textAlign: 'center' as const }}>
                <table cellPadding="0" cellSpacing="0" style={{ margin: '0 auto' }}>
                  <tr>
                    <td style={{ verticalAlign: 'middle', paddingRight: '8px' }}>
                      <Img src="https://www.myservicehub.co/Logo-Icon-Green.png" width="28" height="28" alt="ServiceHub" />
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
          
          <Text style={footerText}>© 2025 ServiceHub Limited. All rights reserved.</Text>
          <Text style={footerTagline}>Building trust in local services</Text>
          
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

export default ExternalReviewInvitation;

const main = { backgroundColor: '#f8f9fa', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', padding: '40px 0' };
const container = { margin: '0 auto', maxWidth: '600px', backgroundColor: '#ffffff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)' };
const logoText = { fontSize: '20px', fontWeight: '700', margin: '0', letterSpacing: '-0.5px' };
const logoServiceWhite = { color: '#ffffff' };
const logoHubWhite = { color: '#dcfce7' };
const heroSection = { width: '100%' };
const heroTable = { width: '100%', height: '200px', backgroundImage: 'url(https://www.myservicehub.co/stock/bg1.jpeg)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' };
const heroTd = { height: '200px', textAlign: 'center' as const, verticalAlign: 'middle' as const };
const logoContainer = { borderRadius: '12px', padding: '16px 28px' };
const contentSection = { padding: '40px 32px', backgroundColor: '#ffffff' };
const h1 = { color: '#0a1b3d', fontSize: '28px', fontWeight: '700', margin: '0 0 24px', textAlign: 'center' as const, letterSpacing: '-0.5px' };
const greeting = { color: '#374151', fontSize: '16px', lineHeight: '1.6', margin: '0 0 16px' };
const paragraph = { color: '#4b5563', fontSize: '15px', lineHeight: '1.7', margin: '0 0 24px' };
const jobBox = { width: '100%', marginBottom: '24px' };
const jobBoxInner = { backgroundColor: '#f0fdf4', borderLeft: '4px solid #34D164', padding: '16px', borderRadius: '0 8px 8px 0' };
const jobLabel = { color: '#16a34a', fontSize: '13px', fontWeight: '600', margin: '0 0 4px' };
const jobValue = { color: '#0a1b3d', fontSize: '16px', fontWeight: '600', margin: '0' };
const buttonContainer = { textAlign: 'center' as const, margin: '28px 0' };
const primaryButton = { backgroundColor: '#34D164', borderRadius: '8px', color: '#ffffff', fontSize: '15px', fontWeight: '600', textDecoration: 'none', textAlign: 'center' as const, display: 'inline-block', padding: '14px 32px' };
const thankYouText = { color: '#16a34a', fontSize: '15px', fontWeight: '600', textAlign: 'center' as const, margin: '0 0 24px' };
const divider = { borderColor: '#e5e7eb', margin: '24px 0' };
const securityNote = { color: '#9ca3af', fontSize: '13px', textAlign: 'center' as const, margin: '0' };
const footer = { backgroundColor: '#0a1b3d', padding: '32px', textAlign: 'center' as const };
const footerLogoText = { fontSize: '18px', fontWeight: '700', margin: '0' };
const footerLogoService = { color: '#ffffff' };
const footerLogoHub = { color: '#34D164' };
const footerText = { color: '#6b7280', fontSize: '12px', margin: '0 0 8px', textAlign: 'center' as const };
const footerTagline = { color: '#9ca3af', fontSize: '12px', margin: '0', textAlign: 'center' as const };
const footerLegalLink = { color: '#6b7280', fontSize: '12px', textDecoration: 'none' };
const footerLegalDivider = { color: '#4b5563', margin: '0 8px' };
