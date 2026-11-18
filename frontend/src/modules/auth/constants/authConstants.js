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
};

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
