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

interface NewMatchingJobProps {
  name?: string;
  jobId?: string;
  tradeTitle?: string;
  tradeCategory?: string;
  location?: string;
  distance?: string;
  jobUrl?: string;
}

export const NewMatchingJob = ({
  name = 'Michael',
  jobId = 'JOB-2025-001',
  tradeTitle = 'Kitchen Renovation',
  tradeCategory = 'Carpentry',
  location = 'Lagos, Nigeria',
  distance = '5 km away',
  jobUrl = 'https://myservicehub.co/jobs/123',
}: NewMatchingJobProps) => (
  <Html>
    <Head>
      <meta name="color-scheme" content="light only" />
      <meta name="supported-color-schemes" content="light only" />
    </Head>
    <Preview>New {tradeCategory} job in your area: {tradeTitle}</Preview>
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
                      <Img src="https://cdn-icons-png.flaticon.com/512/3281/3281289.png" width="32" height="32" alt="" style={{ display: 'block' }} />
                    </td>
                    <td style={{ verticalAlign: 'middle' }}>
                      <Text style={{ ...h1, margin: '0', lineHeight: '1' }}>New Job in Your Area!</Text>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          
          <Text style={greeting}>Hello {name},</Text>
          
          <Text style={paragraph}>
            There's a new job that matches your skills and location!
          </Text>
          
          <table cellPadding="0" cellSpacing="0" style={jobCard}>
            <tr>
              <td style={jobCardInner}>
                <Text style={jobTitle}>{tradeTitle}</Text>
                <Text style={jobCategory}>{tradeCategory}</Text>
                <Text style={jobIdText}>Job ID: #{jobId}</Text>
                <Text style={jobLocation}>📍 {location}</Text>
                <Text style={jobDistance}>Distance: {distance}</Text>
              </td>
            </tr>
          </table>
          
          <Section style={buttonContainer}>
            <Button style={primaryButton} href={jobUrl}>
              See More Details
            </Button>
          </Section>
          
          <Text style={sectionTitle}>Next Steps</Text>
          
          <table cellPadding="0" cellSpacing="0" style={stepsTable}>
            <tr>
              <td style={stepNumberCell}>
                <table cellPadding="0" cellSpacing="0" style={stepCircle}>
                  <tr>
                    <td style={stepCircleInner}>1</td>
                  </tr>
                </table>
              </td>
              <td style={stepText}>Send a message for free to the customer to express interest in this job.</td>
            </tr>
            <tr>
              <td style={stepNumberCell}>
                <table cellPadding="0" cellSpacing="0" style={stepCircle}>
                  <tr>
                    <td style={stepCircleInner}>2</td>
                  </tr>
                </table>
              </td>
              <td style={stepText}>You'll only pay if a customer shares their contact details with you.</td>
            </tr>
            <tr>
              <td style={stepNumberCell}>
                <table cellPadding="0" cellSpacing="0" style={stepCircle}>
                  <tr>
                    <td style={stepCircleInner}>3</td>
                  </tr>
                </table>
              </td>
              <td style={stepText}>Contact the customer as soon as you get the contact details for the best chance of getting hired.</td>
            </tr>
          </table>
          
          <Hr style={divider} />
          
          <Text style={securityNote}>
            You're receiving this because you're a registered tradesperson on ServiceHub.
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
                <Link href="https://x.com/myservice_hub" style={socialIconLink}>
                  <Img src="https://cdn-icons-png.flaticon.com/512/5968/5968958.png" width="22" height="22" alt="X" style={socialIcon} />
                </Link>
                <Link href="https://www.facebook.com/share/18xd2rkVkV/" style={socialIconLink}>
                  <Img src="https://cdn-icons-png.flaticon.com/512/5968/5968764.png" width="22" height="22" alt="Facebook" style={socialIcon} />
                </Link>
                <Link href="https://www.instagram.com/myservice_hub?igsh=MTg2cWwweGQ3MzdoMA==" style={socialIconLink}>
                  <Img src="https://cdn-icons-png.flaticon.com/512/2111/2111463.png" width="22" height="22" alt="Instagram" style={socialIcon} />
                </Link>
                <Link href="https://youtube.com/@myservicehub?si=bKHBrzZ-Hu4hjHW6" style={socialIconLink}>
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

export default NewMatchingJob;

const main = { backgroundColor: '#f8f9fa', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', padding: '40px 0' };
const container = { margin: '0 auto', maxWidth: '600px', backgroundColor: '#ffffff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)' };
const logoText = { fontSize: '20px', fontWeight: '700', margin: '0', letterSpacing: '-0.5px' };
const logoServiceWhite = { color: '#ffffff' };
const logoHubWhite = { color: '#dcfce7' };
const heroSection = { width: '100%' };
const heroTable = { width: '100%', height: '200px', backgroundImage: 'url(https://www.myservicehub.co/stock/bg14.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' };
const heroTd = { height: '200px', textAlign: 'center' as const, verticalAlign: 'middle' as const };
const logoContainer = { borderRadius: '12px', padding: '16px 28px' };
const contentSection = { padding: '40px 32px', backgroundColor: '#ffffff' };
const h1 = { color: '#0a1b3d', fontSize: '28px', fontWeight: '700', margin: '0 0 24px', textAlign: 'center' as const, letterSpacing: '-0.5px' };
const greeting = { color: '#374151', fontSize: '16px', lineHeight: '1.6', margin: '0 0 16px' };
const paragraph = { color: '#4b5563', fontSize: '15px', lineHeight: '1.7', margin: '0 0 24px' };
const jobCard = { width: '100%', marginBottom: '24px' };
const jobCardInner = { backgroundColor: '#f0fdf4', border: '1px solid #dcfce7', borderRadius: '10px', padding: '20px', textAlign: 'center' as const };
const jobTitle = { color: '#0a1b3d', fontSize: '18px', fontWeight: '700', margin: '0 0 8px' };
const jobCategory = { color: '#16a34a', fontSize: '14px', fontWeight: '600', margin: '0 0 12px' };
const jobIdText = { color: '#374151', fontSize: '13px', fontWeight: '600', margin: '0 0 10px' };
const jobLocation = { color: '#6b7280', fontSize: '14px', margin: '0 0 6px' };
const jobDistance = { color: '#6b7280', fontSize: '13px', margin: '0' };
const buttonContainer = { textAlign: 'center' as const, margin: '28px 0' };
const primaryButton = { backgroundColor: '#34D164', borderRadius: '8px', color: '#ffffff', fontSize: '15px', fontWeight: '600', textDecoration: 'none', textAlign: 'center' as const, display: 'inline-block', padding: '14px 32px' };
const sectionTitle = { color: '#0a1b3d', fontSize: '16px', fontWeight: '700', margin: '0 0 16px' };
const stepsTable = { width: '100%', marginBottom: '24px' };
const stepNumberCell = { width: '44px', verticalAlign: 'top' as const, paddingTop: '2px' };
const stepCircle = { width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#0a1b3d' };
const stepCircleInner = { width: '32px', height: '32px', color: '#ffffff', fontSize: '14px', fontWeight: '700' as const, textAlign: 'center' as const, verticalAlign: 'middle' as const, lineHeight: '32px' };
const stepText = { color: '#4b5563', fontSize: '14px', lineHeight: '1.6', paddingLeft: '12px', paddingBottom: '20px', verticalAlign: 'top' as const };
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
