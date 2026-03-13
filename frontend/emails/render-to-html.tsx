/// <reference types="node" />
import { render } from '@react-email/render';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Import all email components
import { JobApproved } from './emails/job-approved';
import { JobPosted } from './emails/job-posted';
import { JobRejected } from './emails/job-rejected';
import { JobCompleted } from './emails/job-completed';
import { JobCancelled } from './emails/job-cancelled';
import { ContactShared } from './emails/contact-shared';
import { NewInterest } from './emails/new-interest';
import { ReviewInvitation } from './emails/review-invitation';
import { ReviewReminder } from './emails/review-reminder';
import { PaymentConfirmation } from './emails/payment-confirmation';
import { ExternalReviewInvitation } from './emails/external-review-invitation';
import { NewReviewReceived } from './emails/new-review-received';
import { NewMatchingJob } from './emails/new-matching-job';
import { NewMessage } from './emails/new-message';
import { EmailOtp } from './emails/email-otp';
import { EmailVerification } from './emails/email-verification';
import { ContactForm } from './emails/contact-form';

// Define placeholder props for each email template
const emailTemplates = [
  {
    name: 'job-approved',
    component: JobApproved,
    props: {
      homeownerName: '{{homeownerName}}',
      jobId: '{{jobId}}',
      jobTitle: '{{jobTitle}}',
      approvedAt: '{{approvedAt}}',
      adminNotes: '{{adminNotes}}',
    }
  },
  {
    name: 'job-posted',
    component: JobPosted,
    props: {
      homeownerName: '{{homeownerName}}',
      jobId: '{{jobId}}',
      jobTitle: '{{jobTitle}}',
      jobLocation: '{{jobLocation}}',
      jobBudget: '{{jobBudget}}',
      postDate: '{{postDate}}',
      manageUrl: '{{manageUrl}}',
    }
  },
  {
    name: 'job-rejected',
    component: JobRejected,
    props: {
      homeownerName: '{{homeownerName}}',
      jobId: '{{jobId}}',
      jobTitle: '{{jobTitle}}',
      reviewedAt: '{{reviewedAt}}',
      rejectionReason: '{{rejectionReason}}',
    }
  },
  {
    name: 'job-completed',
    component: JobCompleted,
    props: {
      tradespersonName: '{{tradespersonName}}',
      jobId: '{{jobId}}',
      jobTitle: '{{jobTitle}}',
      jobLocation: '{{jobLocation}}',
      homeownerName: '{{homeownerName}}',
      completionDate: '{{completionDate}}',
      interestsUrl: '{{interestsUrl}}',
    }
  },
  {
    name: 'job-cancelled',
    component: JobCancelled,
    props: {
      tradespersonName: '{{tradespersonName}}',
      jobId: '{{jobId}}',
      jobTitle: '{{jobTitle}}',
      jobLocation: '{{jobLocation}}',
      homeownerName: '{{homeownerName}}',
      cancellationDate: '{{cancellationDate}}',
      cancellationReason: '{{cancellationReason}}',
      browseJobsUrl: '{{browseJobsUrl}}',
    }
  },
  {
    name: 'contact-shared',
    component: ContactShared,
    props: {
      tradespersonName: '{{tradespersonName}}',
      jobId: '{{jobId}}',
      jobTitle: '{{jobTitle}}',
      jobLocation: '{{jobLocation}}',
      paymentUrl: '{{paymentUrl}}',
    }
  },
  {
    name: 'new-interest',
    component: NewInterest,
    props: {
      homeownerName: '{{homeownerName}}',
      jobId: '{{jobId}}',
      jobTitle: '{{jobTitle}}',
      jobLocation: '{{jobLocation}}',
      tradespersonName: '{{tradespersonName}}',
      tradespersonExperience: '{{tradespersonExperience}}',
      viewUrl: '{{viewUrl}}',
    }
  },
  {
    name: 'review-invitation',
    component: ReviewInvitation,
    props: {
      homeownerName: '{{homeownerName}}',
      tradespersonName: '{{tradespersonName}}',
      jobId: '{{jobId}}',
      jobTitle: '{{jobTitle}}',
      completionDate: '{{completionDate}}',
      reviewUrl: '{{reviewUrl}}',
    }
  },
  {
    name: 'review-reminder',
    component: ReviewReminder,
    props: {
      homeownerName: '{{homeownerName}}',
      tradespersonName: '{{tradespersonName}}',
      jobId: '{{jobId}}',
      jobTitle: '{{jobTitle}}',
      completionDate: '{{completionDate}}',
      reviewUrl: '{{reviewUrl}}',
      daysRemaining: '{{daysRemaining}}',
    }
  },
  {
    name: 'payment-confirmation',
    component: PaymentConfirmation,
    props: {
      tradespersonName: '{{tradespersonName}}',
      jobId: '{{jobId}}',
      jobTitle: '{{jobTitle}}',
      jobLocation: '{{jobLocation}}',
      homeownerName: '{{homeownerName}}',
      homeownerEmail: '{{homeownerEmail}}',
      homeownerPhone: '{{homeownerPhone}}',
    }
  },
  {
    name: 'external-review-invitation',
    component: ExternalReviewInvitation,
    props: {
      clientName: '{{clientName}}',
      tradespersonName: '{{tradespersonName}}',
      jobId: '{{jobId}}',
      jobTitle: '{{jobTitle}}',
      reviewUrl: '{{reviewUrl}}',
    }
  },
  {
    name: 'new-review-received',
    component: NewReviewReceived,
    props: {
      revieweeName: '{{revieweeName}}',
      reviewerName: '{{reviewerName}}',
      jobId: '{{jobId}}',
      jobTitle: '{{jobTitle}}',
      rating: 5,
      reviewUrl: '{{reviewUrl}}',
    }
  },
  {
    name: 'new-matching-job',
    component: NewMatchingJob,
    props: {
      name: '{{name}}',
      jobId: '{{jobId}}',
      tradeTitle: '{{tradeTitle}}',
      tradeCategory: '{{tradeCategory}}',
      location: '{{location}}',
      distance: '{{distance}}',
      jobUrl: '{{jobUrl}}',
    }
  },
  {
    name: 'new-message',
    component: NewMessage,
    props: {
      recipientName: '{{recipientName}}',
      senderName: '{{senderName}}',
      jobTitle: '{{jobTitle}}',
      messagePreview: '{{messagePreview}}',
      conversationUrl: '{{conversationUrl}}',
    }
  },
  {
    name: 'email-otp',
    component: EmailOtp,
    props: {
      name: '{{name}}',
      otpCode: '{{otpCode}}',
    }
  },
  {
    name: 'email-verification',
    component: EmailVerification,
    props: {
      name: '{{name}}',
      verifyLink: '{{verifyLink}}',
    }
  },
  {
    name: 'contact-form',
    component: ContactForm,
    props: {
      name: '{{name}}',
      email: '{{email}}',
      subject: '{{subject}}',
      message: '{{message}}',
      date: '{{date}}',
    }
  },
];

async function renderAllEmails() {
  const outputDir = path.join(process.cwd(), 'html');
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('Rendering email templates to HTML...\n');

  for (const template of emailTemplates) {
    try {
      const Component = template.component;
      const html = await render(Component(template.props as any));
      
      const outputPath = path.join(outputDir, `${template.name}.html`);
      fs.writeFileSync(outputPath, html);
      
      console.log(`✓ ${template.name}.html`);
    } catch (error) {
      console.error(`✗ ${template.name}: ${error}`);
    }
  }

  console.log(`\nDone! HTML files saved to: ${outputDir}`);
}

renderAllEmails();
