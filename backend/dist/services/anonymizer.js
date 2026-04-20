import 'dotenv/config';
import crypto from 'crypto';
import { requireConfiguredSecret } from './config.js';
const APP_SECRET = requireConfiguredSecret();
/**
 * Encrypt a token before storing in DB.
 */
export function encryptToken(token) {
    const key = crypto.scryptSync(APP_SECRET, 'wrapped-salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString('base64');
}
/**
 * Decrypt a stored token.
 */
export function decryptToken(encrypted) {
    const buf = Buffer.from(encrypted, 'base64');
    const key = crypto.scryptSync(APP_SECRET, 'wrapped-salt', 32);
    const iv = buf.subarray(0, 16);
    const tag = buf.subarray(16, 32);
    const encryptedText = buf.subarray(32);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(encryptedText) + decipher.final('utf8');
}
/**
 * Anonymize raw API response → strip all PII/identifiers, keep aggregates only.
 * Runs BEFORE data hits the database.
 */
export function anonymize(raw, service) {
    // Strip known PII fields
    const piiFields = ['id', 'userId', 'user_id', 'email', 'name', 'display_name', 'profileUrl', 'avatar', 'imageUrl', 'uri', 'href'];
    const anonymized = { ...raw };
    for (const key of Object.keys(anonymized)) {
        if (piiFields.includes(key)) {
            delete anonymized[key];
        }
    }
    // Recurse into arrays/objects
    function strip(obj) {
        if (Array.isArray(obj))
            return obj.map(strip);
        if (obj && typeof obj === 'object') {
            const out = {};
            for (const [k, v] of Object.entries(obj)) {
                if (!piiFields.includes(k)) {
                    out[k] = strip(v);
                }
            }
            return out;
        }
        return obj;
    }
    return strip(anonymized);
}
