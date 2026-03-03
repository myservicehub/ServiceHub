// Centralized validation utilities and schemas
import { z } from 'zod';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

// Helpers
export const isValidPhone = (phone, country = 'NG') => {
  try {
    const pn = parsePhoneNumberFromString(String(phone));
    return pn ? pn.isValid() && (country ? pn.country === country : true) : false;
  } catch {
    return false;
  }
};

export const formatPhoneE164 = (phone, country = 'NG') => {
  try {
    const pn = parsePhoneNumberFromString(String(phone));
    if (pn && (!country || pn.country === country)) {
      return pn.format('E.164');
    }
    // Attempt to add country if missing 0-prefix pattern (Nigeria)
    const cleaned = String(phone).replace(/\D/g, '');
    if (country === 'NG') {
      if (cleaned.startsWith('0')) return `+234${cleaned.slice(1)}`;
      if (/^[789]\d{9}$/.test(cleaned)) return `+234${cleaned}`;
    }
    return String(phone);
  } catch {
    return String(phone);
  }
};

// Common field schemas
export const nameSchema = z.string().trim().min(2, 'Name must be at least 2 characters');
export const emailSchema = z.string().trim().email('Please enter a valid email address');
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .refine((val) => /[A-Z]/.test(val), { message: 'Password must contain at least one uppercase letter' })
  .refine((val) => /[a-z]/.test(val), { message: 'Password must contain at least one lowercase letter' })
  .refine((val) => /\d/.test(val), { message: 'Password must contain at least one number' });

export const phoneSchema = z
  .string()
  .trim()
  .min(10, 'Phone number is required')
  .refine((val) => isValidPhone(val, 'NG'), { message: 'Please enter a valid Nigerian phone number' });

export const locationSchema = z.string().trim().min(1, 'State/Location is required');
export const postcodeSchema = z.string().trim().min(1, 'Zipcode is required');

// Composite schemas
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const signupSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  phone: phoneSchema,
  location: locationSchema,
  postcode: postcodeSchema,
  referral_code: z.string().optional(),
});

export const contactSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: z.string().optional().refine((val) => !val || isValidPhone(val, 'NG'), {
    message: 'Please enter a valid phone number',
  }),
  subject: z.string().optional(),
  userType: z.string().optional(),
  message: z.string().trim().min(10, 'Message must be at least 10 characters'),
});

export const jobPostingContactSchema = z.object({
  homeowner_name: nameSchema,
  homeowner_email: emailSchema,
  homeowner_phone: phoneSchema,
});
export const tradespersonSignupSchema = signupSchema.extend({
  trade_categories: z.array(z.string()).min(1, 'Please select at least one trade category'),
  experience_years: z.coerce.number().min(0, 'Experience years must be between 0 and 50').max(50, 'Experience years must be between 0 and 50'),
  company_name: z.string().optional(),
  description: z.string().optional(),
  certifications: z.array(z.string()).optional(),
  referral_code: z.string().optional(),
});