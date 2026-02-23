// TTS Web Worker — runs Kokoro WASM inference off the main thread
// Main thread sends INIT/GENERATE messages, worker replies with READY/AUDIO/ERROR

const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX'
const DEFAULT_VOICE = 'af_sky'

let tts = null

self.onmessage = async (e) => {
  const { type, id } = e.data

  switch (type) {
    case 'INIT': {
      try {
        const { KokoroTTS } = await import('kokoro-js')
        tts = await KokoroTTS.from_pretrained(MODEL_ID, {
          dtype: 'q8',   // 92MB vs 305MB for q4 — 3x smaller, faster load
          device: 'wasm'
        })
        self.postMessage({ type: 'READY', id })
      } catch (err) {
        self.postMessage({ type: 'ERROR', id, error: err.message })
      }
      break
    }

    case 'GENERATE': {
      if (!tts) {
        self.postMessage({ type: 'ERROR', id, error: 'Model not loaded' })
        return
      }
      try {
        const { text, voice } = e.data
        const audio = await tts.generate(text, { voice: voice || DEFAULT_VOICE })
        // Transfer the Float32Array to avoid copying
        const buffer = audio.audio.buffer
        self.postMessage(
          { type: 'AUDIO', id, buffer: audio.audio, samplingRate: audio.sampling_rate },
          [buffer]
        )
      } catch (err) {
        self.postMessage({ type: 'ERROR', id, error: err.message })
      }
      break
    }
  }
}
