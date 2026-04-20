const year = new Date().getFullYear();

const reviewFirstName = process.env.APPLE_REVIEW_FIRST_NAME || 'App';
const reviewLastName = process.env.APPLE_REVIEW_LAST_NAME || 'Review';
const reviewEmail = process.env.APPLE_REVIEW_EMAIL || 'review@wrapped.app';
const reviewPhone = process.env.APPLE_REVIEW_PHONE || '+1 555 555 5555';
const defaultBackendUrl = 'https://api.wrapped.design';
const marketingUrl = process.env.APP_STORE_MARKETING_URL || defaultBackendUrl;
const supportUrl = process.env.APP_STORE_SUPPORT_URL || `${defaultBackendUrl}/api/support`;
const privacyPolicyUrl = process.env.APP_STORE_PRIVACY_URL || `${defaultBackendUrl}/api/privacy`;

module.exports = {
  configVersion: 0,
  apple: {
    copyright: `${year} Wrapped`,
    info: {
      'en-US': {
        title: 'Wrapped',
        subtitle: 'Recaps for everything you love',
        description:
          'Wrapped turns your connected apps and services into playful, Spotify Wrapped-style recaps without changing the way those services already work. Connect supported accounts like Spotify, Strava, Fitbit, Last.fm, Steam, and Apple Health, then generate cinematic story cards, compare your year, and export recap images to share.\n\nYour recap history stays on your device first. Wrapped stores generated sessions locally, syncs only the minimum account data needed for secure connections, and keeps Apple Health processing on-device.\n\nUse Wrapped to build one-service recaps or mix multiple data sources into a single annual story.',
        keywords: [
          'wrapped',
          'recap',
          'spotify wrapped',
          'year in review',
          'apple health',
          'fitness recap',
          'music recap',
          'strava',
          'steam'
        ],
        marketingUrl,
        supportUrl,
        privacyPolicyUrl
      }
    },
    review: {
      firstName: reviewFirstName,
      lastName: reviewLastName,
      email: reviewEmail,
      phone: reviewPhone,
      demoRequired: false,
      notes:
        'Wrapped does not use a visible sign-in screen. The app creates a silent per-install account on first launch. Reviewers can test the Apple Health flow on-device without any external credentials. OAuth integrations for Spotify, Strava, Fitbit, Last.fm, and Steam become available only after the developer configures production client credentials and callback URLs. HealthKit-derived data stays on-device and is not sent to third-party LLM providers.'
    }
  }
};
