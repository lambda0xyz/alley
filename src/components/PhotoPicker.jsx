import { useRef } from 'react'

// Photo picker with two explicit buttons. A single <input type="file"> with
// capture="environment" forces the camera on some phones, hiding the option to
// pick an existing image. Here we keep one hidden input and toggle `capture`
// before opening it: "Choose file" opens the gallery/file picker, "Take photo"
// opens the camera directly. On desktop both fall back to the file dialog.
export default function PhotoPicker({ label, onChange }) {
  const inputRef = useRef(null)

  function open(useCamera) {
    const input = inputRef.current
    if (!input) return
    if (useCamera) input.setAttribute('capture', 'environment')
    else input.removeAttribute('capture')
    input.click()
  }

  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="form-row">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => open(false)}
        >
          Choose file
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => open(true)}
        >
          Take photo
        </button>
      </div>
      <input
        ref={inputRef}
        className="visually-hidden"
        type="file"
        accept="image/*"
        onChange={onChange}
      />
    </div>
  )
}
