import { Share } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { saveShareAsset } from './localStore';
import type { WrappedData } from './types';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildWrappedHtml(session: WrappedData) {
  const cards = session.cards
    .map((card) => `<li><strong>${escapeHtml(card.type)}</strong> · ${escapeHtml(card.service)}</li>`)
    .join('');

  return `
    <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 32px; color: #141008;">
        <h1>Wrapped recap</h1>
        <p>Session: ${escapeHtml(session.sessionId)}</p>
        <p>Created: ${escapeHtml(session.createdAt ?? new Date().toISOString())}</p>
        <ul>${cards}</ul>
      </body>
    </html>
  `;
}

export async function shareWrappedCapture(session: WrappedData, target: unknown) {
  const imageUri = await captureRef(target as never, {
    format: 'png',
    quality: 1,
  });
  const pdf = await Print.printToFileAsync({
    html: buildWrappedHtml(session),
  });

  await Promise.all([
    saveShareAsset({ wrappedSessionId: session.sessionId, kind: 'image', uri: imageUri }),
    saveShareAsset({ wrappedSessionId: session.sessionId, kind: 'pdf', uri: pdf.uri }),
  ]);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(imageUri);
    return;
  }

  await Share.share({
    message: `My Wrapped recap is ready.`,
    url: imageUri,
  });
}
