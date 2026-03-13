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

interface ContactFormProps {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
  date?: string;
}

export const ContactForm = ({
  name = 'John Doe',
  email = 'john@example.com',
  subject = 'General Inquiry',
  message = 'Hello, I have a question about your services. I would like to know more about how ServiceHub works and how I can get started as a tradesperson.',
  date = 'March 12, 2025 at 2:30 PM',
}: ContactFormProps) => (
  <Html>
    <Head>
      <meta name="color-scheme" content="light only" />
      <meta name="supported-color-schemes" content="light only" />
    </Head>
    <Preview>New contact form submission from {name}</Preview>
    <Body style={main}>
      <Container style={container}>
        
        <Section style={headerSection}>
          <table cellPadding="0" cellSpacing="0" width="100%" style={headerTable}>
            <tr>
              <td align="center" style={headerTd}>
                <table cellPadding="0" cellSpacing="0" style={{ margin: '0 auto' }}>
                  <tr>
                    <td style={{ verticalAlign: 'middle', paddingRight: '10px' }}>
                      <Img src="https://my-servicehub.vercel.app/Logo-Icon-Green.png" width="32" height="32" alt="ServiceHub" />
                    </td>
                    <td style={{ verticalAlign: 'middle' }}>
                      <Text style={logoText}>
                        <span style={logoServiceWhite}>Service</span>
                        <span style={logoHubWhite}>Hub</span>
                      </Text>
                    </td>
                  </tr>
                </table>
                <Text style={headerTitle}>New Contact Message</Text>
              </td>
            </tr>
          </table>
        </Section>

        <Section style={contentSection}>
          <Text style={introText}>
            You have received a new message from the contact form on the website.
          </Text>
          
          <table cellPadding="0" cellSpacing="0" style={detailsCard}>
            <tr>
              <td style={detailRow}>
                <Text style={detailLabel}>Name</Text>
                <Text style={detailValue}>{name}</Text>
              </td>
            </tr>
            <tr>
              <td style={detailRow}>
                <Text style={detailLabel}>Email</Text>
                <Text style={detailValueLink}>{email}</Text>
              </td>
            </tr>
            <tr>
              <td style={detailRow}>
                <Text style={detailLabel}>Subject</Text>
                <Text style={detailValue}>{subject}</Text>
              </td>
            </tr>
            <tr>
              <td style={{ ...detailRow, borderBottom: 'none' }}>
                <Text style={detailLabel}>Date</Text>
                <Text style={detailValue}>{date}</Text>
              </td>
            </tr>
          </table>
          
          <table cellPadding="0" cellSpacing="0" style={messageBox}>
            <tr>
              <td style={messageBoxInner}>
                <Text style={messageLabel}>Message:</Text>
                <Text style={messageText}>{message}</Text>
              </td>
            </tr>
          </table>
          
          <Hr style={divider} />
          
          <Text style={footerNote}>
            ServiceHub Support Notification
          </Text>
        </Section>

        <Section style={footer}>
          <table cellPadding="0" cellSpacing="0" style={{ width: '100%' }}>
            <tr>
              <td style={{ textAlign: 'center' as const }}>
                <table cellPadding="0" cellSpacing="0" style={{ margin: '0 auto' }}>
                  <tr>
                    <td style={{ verticalAlign: 'middle', paddingRight: '8px' }}>
                      <Img src="https://my-servicehub.vercel.app/Logo-Icon-Green.png" width="24" height="24" alt="ServiceHub" />
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
          <Text style={footerAddress}>6, D Place Guest House, Off Omimi Link Road, Ekpan, Delta State, Nigeria</Text>
          
          <table cellPadding="0" cellSpacing="0" style={{ width: '100%', marginTop: '12px' }}>
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

export default ContactForm;

const main = { backgroundColor: '#f8f9fa', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', padding: '40px 0' };
const container = { margin: '0 auto', maxWidth: '600px', backgroundColor: '#ffffff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)' };
const headerSection = { width: '100%' };
const headerTable = { width: '100%', backgroundColor: '#0a1b3d', padding: '24px 0' };
const headerTd = { padding: '24px', textAlign: 'center' as const };
const logoText = { fontSize: '18px', fontWeight: '700', margin: '0 0 16px', letterSpacing: '-0.5px' };
const logoServiceWhite = { color: '#ffffff' };
const logoHubWhite = { color: '#34D164' };
const headerTitle = { color: '#ffffff', fontSize: '20px', fontWeight: '600', margin: '0' };
const contentSection = { padding: '32px', backgroundColor: '#ffffff' };
const introText = { color: '#4b5563', fontSize: '15px', lineHeight: '1.6', margin: '0 0 24px' };
const detailsCard = { width: '100%', backgroundColor: '#f8fafc', borderRadius: '10px', marginBottom: '24px' };
const detailRow = { padding: '12px 16px', borderBottom: '1px solid #e5e7eb' };
const detailLabel = { color: '#6b7280', fontSize: '12px', fontWeight: '600', margin: '0 0 4px', textTransform: 'uppercase' as const };
const detailValue = { color: '#0a1b3d', fontSize: '15px', fontWeight: '500', margin: '0' };
const detailValueLink = { color: '#34D164', fontSize: '15px', fontWeight: '500', margin: '0' };
const messageBox = { width: '100%', marginBottom: '24px' };
const messageBoxInner = { backgroundColor: '#f9fafb', borderLeft: '4px solid #34D164', padding: '16px', borderRadius: '0 8px 8px 0' };
const messageLabel = { color: '#374151', fontSize: '13px', fontWeight: '600', margin: '0 0 8px' };
const messageText = { color: '#4b5563', fontSize: '15px', lineHeight: '1.6', margin: '0', whiteSpace: 'pre-wrap' as const };
const divider = { borderColor: '#e5e7eb', margin: '24px 0' };
const footerNote = { color: '#9ca3af', fontSize: '13px', textAlign: 'center' as const, margin: '0' };
const footer = { backgroundColor: '#0a1b3d', padding: '24px', textAlign: 'center' as const };
const footerLogoText = { fontSize: '16px', fontWeight: '700', margin: '0 0 16px' };
const footerLogoService = { color: '#ffffff' };
const footerLogoHub = { color: '#34D164' };
const footerText = { color: '#6b7280', fontSize: '12px', margin: '0 0 8px', textAlign: 'center' as const };
const footerAddress = { color: '#4b5563', fontSize: '11px', margin: '0', textAlign: 'center' as const };
const footerLegalLink = { color: '#6b7280', fontSize: '12px', textDecoration: 'none' };
const footerLegalDivider = { color: '#4b5563', margin: '0 8px' };
