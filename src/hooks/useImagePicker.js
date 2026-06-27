import { useCallback, useEffect, useRef, useState } from 'react'

// Manages a single picked image file with a local object-URL preview. The
// preview URL is created on pick and revoked whenever it's replaced, cleared,
// or the component unmounts, so we never leak object URLs. Wire `onChange`
// straight to a <PhotoPicker>; call `clear` to reset file + preview (used when
// an edit form opens, cancels, or saves).
export function useImagePicker() {
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  // Mirror the live URL so the unmount cleanup can revoke it without a setState.
  const urlRef = useRef(null)

  const setPreview = useCallback((url) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    urlRef.current = url
    setPreviewUrl(url)
  }, [])

  const onChange = useCallback(
    (e) => {
      const picked = e.target.files?.[0] ?? null
      setFile(picked)
      setPreview(picked ? URL.createObjectURL(picked) : null)
    },
    [setPreview],
  )

  const clear = useCallback(() => {
    setFile(null)
    setPreview(null)
  }, [setPreview])

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    },
    [],
  )

  return { file, previewUrl, onChange, clear }
}
