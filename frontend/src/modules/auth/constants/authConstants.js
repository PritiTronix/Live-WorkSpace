/**
 * Authentication Presentation Constants
 * Single source of truth for auth display text, feature items, and OAuth provider status.
 */

export const AUTH_FEATURES = [
  {
    id: 'project-management',
    name: 'Project\nManagement',
    shortName: 'Project\nManagement',
    icon: 'zap',
  },
  {
    id: 'ticket-tracking',
    name: 'Ticket\nTracking',
    shortName: 'Ticket\nTracking',
    icon: 'ticket',
  },
  {
    id: 'collaboration',
    name: 'Real-Time\nCollaboration',
    shortName: 'Real-Time\nCollab',
    icon: 'users',
  },
  {
    id: 'sla-monitoring',
    name: 'SLA\nMonitoring',
    shortName: 'SLA\nMonitoring',
    icon: 'shield-check',
  },
  {
    id: 'analytics',
    name: 'Analytics &\nReports',
    shortName: 'Analytics & Reports',
    icon: 'bar-chart',
  },
];

export const AUTH_TEXT = {
  brandName: 'Live Workspace',
  headlineMain: 'One Workspace.',
  headlineAccent: 'Complete Project Visibility.',
  subtext: 'Manage projects, tasks, tickets, deadlines, and team collaboration from a single place.',
  loginTitle: 'Welcome Back',
  loginSubtitle: 'Log in to continue managing your projects and work.',
  signUpTitle: 'Create your account',
  signUpSubtitle: 'Start managing your projects and work in one place.',
  fullNameLabel: 'Full Name',
  fullNamePlaceholder: 'Enter your full name',
  workEmailLabel: 'Work Email',
  workEmailPlaceholder: 'name@company.com',
  createPasswordLabel: 'Password',
  createPasswordPlaceholder: 'Create a strong password',
  passwordStrengthLabel: 'Password Strength',
  passwordHint: 'At least 8 characters with a mix of letters, numbers, and symbols.',
  termsAgreementText: 'I agree to the Terms of Service and Privacy Policy',
  createAccountButtonText: 'Create Account',
  creatingAccountButtonText: 'Creating Account...',
  alreadyAccountPrompt: 'Already have an account?',
  logInLinkText: 'Log In',
  orDivider: 'or continue with',
  noAccountPrompt: "Don't have an account?",
  signUpLinkText: 'Sign Up',
  forgotPasswordText: 'Forgot Password?',
  submitButtonText: 'Login',
  submittingButtonText: 'Logging In...',
  emailLabel: 'Email Address',
  passwordLabel: 'Password',
  emailPlaceholder: 'Email Address',
  passwordPlaceholder: 'Password',
  oauthUnavailableTooltip: 'Not available yet',
  genericError: 'Invalid email or password',
  networkError: 'Unable to connect to the server. Please check your connection.',
  termsRequiredError: 'You must agree to the Terms of Service and Privacy Policy.',
  nameRequiredError: 'Please enter your full name.',
  emailInvalidError: 'Please enter a valid work email address.',
  duplicateEmailError: 'A user with this email address already exists.',
};

/**
 * Common trivial/breached passwords forbidden in production.
 * Kept strictly in sync with backend/app/core/security.py
 */
export const FORBIDDEN_PASSWORDS = new Set([
  'password',
  'password123',
  '12345678',
  '123456789',
  'admin123',
  'qwerty123',
  'welcome1',
  'letmein1',
  'changeme',
]);

/**
 * Validates password rules matching backend validate_password_strength() in security.py.
 * @param {string} password
 * @returns {{ valid: boolean, error?: string }}
 */
export function validatePasswordRules(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required and cannot be empty.' };
  }
  const stripped = password.trim();
  if (stripped.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long.' };
  }
  if (password.length > 128) {
    return { valid: false, error: 'Password cannot exceed 128 characters.' };
  }
  if (!/[A-Za-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one letter (a-z or A-Z).' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one numeric digit (0-9).' };
  }
  if (FORBIDDEN_PASSWORDS.has(stripped.toLowerCase())) {
    return {
      valid: false,
      error: 'Password is too common and easily guessable. Please choose a stronger password.',
    };
  }
  return { valid: true, error: null };
}

/**
 * Calculates password strength score (0 to 4) and label.
 * Guarantees that score >= 2 and especially 'Strong' (4) is NEVER shown unless backend validation passes.
 * @param {string} password
 * @returns {{ score: number, label: string, colorClass: string, barClass: string, valid: boolean, error?: string }}
 */
export function calculatePasswordStrength(password) {
  if (!password) {
    return {
      score: 0,
      label: '',
      colorClass: 'text-text-muted',
      barClass: 'bg-slate-200',
      valid: false,
      error: null,
    };
  }

  const backendCheck = validatePasswordRules(password);
  if (!backendCheck.valid) {
    return {
      score: 1,
      label: 'Weak',
      colorClass: 'text-rose-500 font-semibold',
      barClass: 'bg-rose-500',
      valid: false,
      error: backendCheck.error,
    };
  }

  // Password meets backend minimum criteria. Compute advanced complexity score.
  let score = 2; // Fair (meets minimum backend rules: length >= 8, letter, number)
  const hasMixedCase = /[a-z]/.test(password) && /[A-Z]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const isLonger = password.length >= 10;

  if (isLonger && (hasMixedCase || hasSpecial)) {
    score = 3; // Good
  }
  if (isLonger && hasMixedCase && hasSpecial && /[0-9]/.test(password)) {
    score = 4; // Strong
  }

  if (score === 2) {
    return {
      score: 2,
      label: 'Fair',
      colorClass: 'text-amber-500 font-semibold',
      barClass: 'bg-amber-500',
      valid: true,
      error: null,
    };
  }
  if (score === 3) {
    return {
      score: 3,
      label: 'Good',
      colorClass: 'text-emerald-500 font-semibold',
      barClass: 'bg-emerald-500',
      valid: true,
      error: null,
    };
  }
  return {
    score: 4,
    label: 'Strong',
    colorClass: 'text-emerald-600 font-semibold',
    barClass: 'bg-emerald-500',
    valid: true,
    error: null,
  };
}

export const SOCIAL_PROVIDERS = [
  {
    id: 'google',
    name: 'Google',
    available: false,
  },
  {
    id: 'microsoft',
    name: 'Microsoft',
    available: false,
  },
  {
    id: 'github',
    name: 'GitHub',
    available: false,
  },
];
