import { v2 as cloudinary } from 'cloudinary'

let configured = false

function getCloudinary() {
  if (!configured) {
    const cloud_name = (process.env.CLOUDINARY_CLOUD_NAME || '').trim()
    const api_key = (process.env.CLOUDINARY_API_KEY || '').trim()
    const api_secret = (process.env.CLOUDINARY_API_SECRET || '').trim()

    if (!cloud_name || !api_key || !api_secret) {
      const missing = [
        !cloud_name && 'CLOUDINARY_CLOUD_NAME',
        !api_key && 'CLOUDINARY_API_KEY',
        !api_secret && 'CLOUDINARY_API_SECRET',
      ].filter(Boolean).join(', ')
      throw new Error(`Cloudinary is not configured: missing ${missing}.`)
    }

    cloudinary.config({ cloud_name, api_key, api_secret, secure: true })
    configured = true
  }
  return cloudinary
}

// PDFs are stored as 'raw' resources — we only need durable file storage and
// a download URL, not Cloudinary's image/video derivative pipeline.
export function uploadInvoicePdf(buffer, { folder, filename }) {
  const client = getCloudinary()
  return new Promise((resolve, reject) => {
    const stream = client.uploader.upload_stream(
      { resource_type: 'raw', folder, filename_override: filename, use_filename: true, unique_filename: true },
      (err, result) => (err ? reject(err) : resolve(result))
    )
    stream.end(buffer)
  })
}

export async function deleteInvoicePdf(publicId) {
  if (!publicId) return
  const client = getCloudinary()
  await client.uploader.destroy(publicId, { resource_type: 'raw' })
}

// Document PDFs are uploaded as 'image' resources (not 'raw', like invoices)
// so Cloudinary's page-transformation pipeline (pg_1 → first-page thumbnail)
// is available, and as `type: 'authenticated'` so the asset has no public
// delivery URL at all — every access requires a freshly server-signed URL
// (see signedDocumentUrl/signedDocumentThumbnailUrl below), fetched by our
// own API routes and never handed to the browser directly. That's what
// keeps a client from ever hitting Cloudinary's API on its own to fetch or
// re-download the file.
export function uploadDocumentPdf(buffer, { folder, filename }) {
  const client = getCloudinary()
  return new Promise((resolve, reject) => {
    const stream = client.uploader.upload_stream(
      { resource_type: 'image', type: 'authenticated', folder, filename_override: filename, use_filename: true, unique_filename: true, format: 'pdf' },
      (err, result) => (err ? reject(err) : resolve(result))
    )
    stream.end(buffer)
  })
}

export async function deleteDocumentPdf(publicId) {
  if (!publicId) return
  const client = getCloudinary()
  await client.uploader.destroy(publicId, { resource_type: 'image', type: 'authenticated' })
}

// Short-lived (60s) signed URL for the full PDF — used server-side only, by
// the view-document-pdf route, to fetch bytes it then streams to the
// browser itself. Never sent to the client as-is.
export function signedDocumentUrl(publicId) {
  const client = getCloudinary()
  return client.utils.private_download_url(publicId, 'pdf', {
    resource_type: 'image',
    type: 'authenticated',
    expires_at: Math.floor(Date.now() / 1000) + 60,
  })
}

// Same idea for the first-page-as-JPEG thumbnail (used on the Documents
// sidebar icon).
export function signedDocumentThumbnailUrl(publicId) {
  const client = getCloudinary()
  return client.url(publicId, {
    resource_type: 'image',
    type: 'authenticated',
    format: 'jpg',
    sign_url: true,
    page: 1,
    transformation: [{ width: 96, height: 128, crop: 'fill', quality: 'auto' }],
    expires_at: Math.floor(Date.now() / 1000) + 60,
  })
}
