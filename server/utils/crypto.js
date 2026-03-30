import { createHmac, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';

const MASTER_KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');

//==== Afled en unik AES-256 nøgle per hyggesnak fra master-nøglen ====//
function deriveKey(hyggesnakId) {
    return createHmac('sha256', MASTER_KEY)
        .update(`hyggesnak-${hyggesnakId}`)
        .digest();
}

//==== Kryptér beskedindhold med AES-256-GCM ====//
export function encryptMessage(plaintext, hyggesnakId) {
    const key = deriveKey(hyggesnakId);
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

//==== Dekryptér beskedindhold ====//
export function decryptMessage(ciphertext, hyggesnakId) {
    const [ivB64, tagB64, dataB64] = ciphertext.split(':');
    const key = deriveKey(hyggesnakId);
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return decipher.update(Buffer.from(dataB64, 'base64'), undefined, 'utf8') + decipher.final('utf8');
}
