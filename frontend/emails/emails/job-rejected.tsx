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

interface JobRejectedProps {
  homeownerName?: string;
  jobId?: string;
  jobTitle?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

export const JobRejected = ({
  homeownerName = 'John',
  jobId = 'JOB-2025-001',
  jobTitle = 'Kitchen Renovation',
  reviewedAt = 'March 12, 2025 at 2:30 PM',
  rejectionReason = 'Please provide more details about the scope of work and upload clearer images of the project area.',
}: JobRejectedProps) => (
  <Html>
    <Head>
      <meta name="color-scheme" content="light only" />
      <meta name="supported-color-schemes" content="light only" />
    </Head>
    <Preview>Your job "{jobTitle}" needs some updates before approval</Preview>
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
          <Heading style={h1}>Job Requires Updates</Heading>
          
          <Text style={greeting}>Hello {homeownerName},</Text>
          
          <Text style={paragraph}>
            Thank you for submitting your job posting to ServiceHub. After review, 
            we need some updates before we can approve your job.
          </Text>
          
          <table cellPadding="0" cellSpacing="0" style={detailsCard}>
            <tr>
              <td style={detailRow}>
                <Text style={detailLabel}>Job <span style={{ color: '#6b7280', fontWeight: '400' }}>#{jobId}</span></Text>
                <Text style={detailValue}>{jobTitle}</Text>
              </td>
            </tr>
            <tr>
              <td style={detailRow}>
                <Text style={detailLabel}>Status</Text>
                <Text style={detailValueOrange}>⚠️ Requires Updates</Text>
              </td>
            </tr>
            <tr>
              <td style={{ ...detailRow, borderBottom: 'none' }}>
                <Text style={detailLabel}>Reviewed</Text>
                <Text style={detailValue}>{reviewedAt}</Text>
              </td>
            </tr>
          </table>
          
          <table cellPadding="0" cellSpacing="0" style={reasonBox}>
            <tr>
              <td style={reasonInner}>
                <Text style={reasonLabel}>📝 Required Updates:</Text>
                <Text style={reasonText}>{rejectionReason}</Text>
              </td>
            </tr>
          </table>
          
          <Text style={paragraph}>
            <strong>How to fix:</strong>
          </Text>
          <Text style={listItem}>1. Log into your ServiceHub account</Text>
          <Text style={listItem}>2. Go to "My Jobs" section</Text>
          <Text style={listItem}>3. Edit your job posting with the required updates</Text>
          <Text style={listItem}>4. Resubmit for review</Text>
          
          <Section style={buttonContainer}>
            <Button style={primaryButton} href="https://myservicehub.co/dashboard/jobs">
              Edit Your Job
            </Button>
          </Section>
          
          <Hr style={divider} />
          
          <Text style={securityNote}>
            If you have questions about these requirements, please contact our support team.
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

export default JobRejected;

const main = { backgroundColor: '#f8f9fa', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', padding: '40px 0' };
const container = { margin: '0 auto', maxWidth: '600px', backgroundColor: '#ffffff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)' };
const logoText = { fontSize: '20px', fontWeight: '700', margin: '0', letterSpacing: '-0.5px' };
const logoServiceWhite = { color: '#ffffff' };
const logoHubWhite = { color: '#dcfce7' };
const heroSection = { width: '100%' };
const heroTable = { width: '100%', height: '200px', backgroundImage: 'url(https://www.myservicehub.co/stock/bg10.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' };
const heroTd = { height: '200px', textAlign: 'center' as const, verticalAlign: 'middle' as const };
const logoContainer = { borderRadius: '12px', padding: '16px 28px' };
const contentSection = { padding: '40px 32px', backgroundColor: '#ffffff' };
const h1 = { color: '#0a1b3d', fontSize: '28px', fontWeight: '700', margin: '0 0 24px', textAlign: 'center' as const, letterSpacing: '-0.5px' };
const greeting = { color: '#374151', fontSize: '16px', lineHeight: '1.6', margin: '0 0 16px' };
const paragraph = { color: '#4b5563', fontSize: '15px', lineHeight: '1.7', margin: '0 0 24px' };
const detailsCard = { width: '100%', backgroundColor: '#f8fafc', borderRadius: '10px', marginBottom: '24px' };
const detailRow = { padding: '12px 16px', borderBottom: '1px solid #e5e7eb' };
const detailLabel = { color: '#6b7280', fontSize: '13px', margin: '0 0 4px' };
const detailValue = { color: '#0a1b3d', fontSize: '15px', fontWeight: '600', margin: '0' };
const detailValueOrange = { color: '#d97706', fontSize: '15px', fontWeight: '600', margin: '0' };
const reasonBox = { width: '100%', marginBottom: '24px' };
const reasonInner = { backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px 16px' };
const reasonLabel = { color: '#dc2626', fontSize: '13px', fontWeight: '600', margin: '0 0 8px' };
const reasonText = { color: '#dc2626', fontSize: '14px', margin: '0', lineHeight: '1.5' };
const listItem = { color: '#4b5563', fontSize: '14px', margin: '0 0 8px', paddingLeft: '8px' };
const buttonContainer = { textAlign: 'center' as const, margin: '28px 0' };
const primaryButton = { backgroundColor: '#34D164', borderRadius: '8px', color: '#ffffff', fontSize: '15px', fontWeight: '600', textDecoration: 'none', textAlign: 'center' as const, display: 'inline-block', padding: '14px 32px' };
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
