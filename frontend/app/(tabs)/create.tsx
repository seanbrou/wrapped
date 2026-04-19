import { Redirect } from 'expo-router';

// Stub route — the Create tab opens the /wizard modal via a custom
// tabBarButton in app/(tabs)/_layout.tsx. If the user somehow lands
// here we bounce them to the wizard directly.
export default function CreateRedirect() {
  return <Redirect href="/wizard" />;
}
