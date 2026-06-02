import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH_BYTES = 12
const AUTH_TAG_LENGTH_BYTES = 16
const KEY_LENGTH_BYTES = 32
const ENCRYPTED_FIELD_PREFIX = 'v1:'

function parseEncryptionKey(rawKey: string): Buffer {
  const trimmedKey = rawKey.trim()
  if (trimmedKey.length === 0) {
    throw new Error('FIELD_ENCRYPTION_KEY is empty')
  }

  let key: Buffer | null = null

  if (trimmedKey.startsWith('base64:')) {
    key = Buffer.from(trimmedKey.slice('base64:'.length), 'base64')
  } else if (trimmedKey.startsWith('hex:')) {
    key = Buffer.from(trimmedKey.slice('hex:'.length), 'hex')
  } else if (/^[a-f0-9]{64}$/i.test(trimmedKey)) {
    key = Buffer.from(trimmedKey, 'hex')
  } else {
    const base64Candidate = Buffer.from(trimmedKey, 'base64')
    key =
      base64Candidate.length === KEY_LENGTH_BYTES
        ? base64Candidate
        : Buffer.from(trimmedKey, 'utf8')
  }

  if (key.length !== KEY_LENGTH_BYTES) {
    throw new Error('FIELD_ENCRYPTION_KEY must be exactly 32 bytes')
  }

  return key
}

function getEncryptionKey(): Buffer {
  const rawKey = process.env.FIELD_ENCRYPTION_KEY
  if (!rawKey) {
    throw new Error('FIELD_ENCRYPTION_KEY is required')
  }
  return parseEncryptionKey(rawKey)
}

export function encryptSecretField(
  value: string | null | undefined,
): string | undefined {
  if (value == null || value.length === 0) return undefined

  const iv = randomBytes(IV_LENGTH_BYTES)
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv)
  const encrypted = Buffer.concat([
    cipher.update(value, 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  return [
    'v1',
    iv.toString('base64url'),
    authTag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join(':')
}

export function decryptSecretField(
  value: string | null | undefined,
): string | null {
  if (value == null || value.length === 0) return null
  if (!value.startsWith(ENCRYPTED_FIELD_PREFIX)) return value

  const [, encodedIv, encodedAuthTag, encodedEncrypted] = value.split(':')
  if (!encodedIv || !encodedAuthTag || !encodedEncrypted) {
    throw new Error('Encrypted field has an invalid format')
  }

  const iv = Buffer.from(encodedIv, 'base64url')
  const authTag = Buffer.from(encodedAuthTag, 'base64url')
  const encrypted = Buffer.from(encodedEncrypted, 'base64url')

  if (iv.length !== IV_LENGTH_BYTES) {
    throw new Error('Encrypted field has an invalid IV')
  }
  if (authTag.length !== AUTH_TAG_LENGTH_BYTES) {
    throw new Error('Encrypted field has an invalid auth tag')
  }

  const decipher = createDecipheriv(ALGORITHM, getEncryptionKey(), iv)
  decipher.setAuthTag(authTag)

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString('utf8')
}
