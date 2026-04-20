import { verifyAccessToken } from './session.js';
export async function requireAuth(request, reply) {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        await reply.status(401).send({ error: 'Missing bearer token' });
        return null;
    }
    const token = authHeader.slice('Bearer '.length).trim();
    const auth = await verifyAccessToken(token);
    if (!auth) {
        await reply.status(401).send({ error: 'Invalid or expired session' });
        return null;
    }
    return auth;
}
