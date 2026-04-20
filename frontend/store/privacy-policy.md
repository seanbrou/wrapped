# Wrapped Privacy Policy

Wrapped generates recap experiences from data the user explicitly connects or grants access to.

## What Wrapped stores

- A silent per-install account identifier and session tokens needed to talk to the backend securely
- Connection metadata for supported services
- Generated wrapped sessions, recap cards, and exported share assets on the device
- Minimal synced aggregates required to reconnect services and rebuild recaps

## What stays on-device

- Recap history and cached card payloads are stored locally first
- Apple Health summaries are generated on-device
- HealthKit-derived data is not sent to third-party LLM providers

## What may leave the device

- OAuth tokens and normalized aggregates for supported third-party services are stored on the backend so the app can refresh connections and sync data again later
- Selected recap copy may be generated through Vercel AI Gateway for supported non-health services

## User controls

- Revoke any supported connection
- Delete local recap history
- Delete all app data, including backend tokens and synced aggregates tied to the install

## Contact

Support URL and privacy-policy URL in App Store metadata should point to the production support and privacy pages before submission.
