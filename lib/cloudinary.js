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
