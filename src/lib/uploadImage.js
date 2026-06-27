import { supabase } from './supabase'

const BUCKET = 'item-images'
const MAX_DIM = 800 // longest edge, px — plenty for a thumbnail/detail photo
const JPEG_QUALITY = 0.8

const UPLOAD_ERROR = {
  message: "Couldn't upload the image — check your connection and try again.",
}

// Downscale + re-encode in the browser before upload. Phone photos are often
// 3–8 MB; on convention WiFi that's a slow, flaky upload. We cap the longest
// edge at MAX_DIM and re-encode to JPEG, which typically lands well under
// 200 KB with no visible quality loss at card/thumbnail sizes.
//
// createImageBitmap with imageOrientation:'from-image' bakes in EXIF rotation,
// so portrait phone shots don't come out sideways.
async function compress(file) {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: 'from-image',
  })

  const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
  )
  // toBlob can yield null if the canvas is tainted/too large; fall back to the
  // original file so the upload still proceeds.
  return blob || file
}

// Compresses `file`, uploads it to the caller's own folder, and returns the
// public URL to store in items.image_url. Mirrors the { error } shape the rest
// of the app uses so callers can handle failures uniformly.
export async function uploadItemImage(file) {
  let user
  try {
    const res = await supabase.auth.getUser()
    user = res.data.user
  } catch {
    return { url: null, error: UPLOAD_ERROR }
  }
  if (!user) {
    return {
      url: null,
      error: { message: 'Your session has expired — please sign in again.' },
    }
  }

  try {
    const blob = await compress(file)
    const path = `${user.id}/${crypto.randomUUID()}.jpg`

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, { cacheControl: '3600', contentType: 'image/jpeg' })
    if (error) return { url: null, error }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    return { url: data.publicUrl, error: null }
  } catch {
    return { url: null, error: UPLOAD_ERROR }
  }
}
