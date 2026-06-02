import sharp from 'sharp'

type OptimizeImageInput = {
  buffer: Buffer
  mimeType: string
}

type OptimizeImageResult = {
  buffer: Buffer
  mimeType: string
  wasOptimized: boolean
}

const OPTIMIZABLE_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
])

function normalizeImageMimeType(mimeType: string): string {
  const normalized = mimeType.toLowerCase()
  return normalized === 'image/jpg' ? 'image/jpeg' : normalized
}

function isOptimizableImage(mimeType: string): boolean {
  return OPTIMIZABLE_IMAGE_MIME_TYPES.has(mimeType.toLowerCase())
}

async function encodeImageForUpload(buffer: Buffer, mimeType: string): Promise<Buffer> {
  const pipeline = sharp(buffer, { animated: true }).rotate()

  if (mimeType === 'image/jpeg') {
    return pipeline
      .jpeg({
        quality: 92,
        mozjpeg: true,
        chromaSubsampling: '4:4:4',
      })
      .toBuffer()
  }

  if (mimeType === 'image/png') {
    return pipeline
      .png({
        compressionLevel: 9,
        adaptiveFiltering: true,
      })
      .toBuffer()
  }

  if (mimeType === 'image/webp') {
    return pipeline
      .webp({
        quality: 92,
        effort: 6,
      })
      .toBuffer()
  }

  return pipeline
    .avif({
      quality: 85,
      effort: 6,
    })
    .toBuffer()
}

export async function optimizeImageForUpload({
  buffer,
  mimeType,
}: OptimizeImageInput): Promise<OptimizeImageResult> {
  const normalizedMimeType = normalizeImageMimeType(mimeType)

  if (!isOptimizableImage(normalizedMimeType)) {
    return { buffer, mimeType, wasOptimized: false }
  }

  try {
    const optimizedBuffer = await encodeImageForUpload(buffer, normalizedMimeType)
    if (optimizedBuffer.length >= buffer.length) {
      return { buffer, mimeType: normalizedMimeType, wasOptimized: false }
    }

    return {
      buffer: optimizedBuffer,
      mimeType: normalizedMimeType,
      wasOptimized: true,
    }
  } catch (err) {
    console.warn('[image.optimizeForUpload] optimization skipped', err)
    return { buffer, mimeType, wasOptimized: false }
  }
}
