# App Review Notes

- Wrapped uses a silent per-install account bootstrap. There is no user-facing sign-in UI.
- Apple Health works entirely on-device and can be reviewed without external credentials.
- Spotify, Strava, Fitbit, Last.fm, and Steam rely on the developer's production OAuth credentials and callback URLs.
- Delete-all-data clears local recap storage and requests backend deletion for the install account.
- Share exports are only created when the user explicitly chooses to export or share.
