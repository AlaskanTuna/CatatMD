// Runs on the audio thread. Copies each mono block to the main thread; all
// framing and resampling happens in pcm-capture.ts where it can be tested.
class PcmCaptureProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0]?.[0]
    if (channel) this.port.postMessage(channel.slice(0))
    return true
  }
}

registerProcessor('pcm-capture', PcmCaptureProcessor)
