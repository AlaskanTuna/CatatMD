/**
 * Collects one recording and releases its tracks before the caller handles it.
 *
 * A live microphone track outliving the recording leaves the browser's
 * recording indicator on, which in a consulting room reads as "still
 * listening".
 */
export function createChunkedRecorder(
  stream: MediaStream,
  chunks: { current: Blob[] },
  onStop: (recorder: MediaRecorder) => void,
): MediaRecorder {
  const recorder = new MediaRecorder(stream)
  chunks.current = []
  recorder.ondataavailable = (event) => chunks.current.push(event.data)
  recorder.onstop = () => {
    for (const track of stream.getTracks()) track.stop()
    onStop(recorder)
  }
  return recorder
}
