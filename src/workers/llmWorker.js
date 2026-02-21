// WebLLM worker — runs Qwen2.5-0.5B in a dedicated thread

let engine = null

const MODEL_ID = 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC'

const SYSTEM_PROMPT = `You are a witty economy narrator for a simulation game. Given economic stats, tell a SHORT story (1-3 sentences). Be dramatic, colorful, and entertaining. Tell a STORY about the people and businesses — don't just list stats. Use metaphors and vivid language. Keep it under 60 words.`

self.onmessage = async (e) => {
  const { type, id, prompt } = e.data

  if (type === 'INIT') {
    try {
      // Check WebGPU availability
      if (typeof navigator === 'undefined' || !navigator.gpu) {
        self.postMessage({ type: 'STATUS', status: 'error', error: 'WebGPU not available' })
        return
      }

      self.postMessage({ type: 'STATUS', status: 'loading', progress: 0 })

      const { CreateMLCEngine } = await import('@mlc-ai/web-llm')

      engine = await CreateMLCEngine(MODEL_ID, {
        initProgressCallback: (report) => {
          const progress = report.progress || 0
          self.postMessage({ type: 'STATUS', status: 'loading', progress: Math.round(progress * 100) })
        }
      })

      self.postMessage({ type: 'STATUS', status: 'ready' })
    } catch (err) {
      console.error('[LLM Worker] Init failed:', err)
      self.postMessage({ type: 'STATUS', status: 'error', error: err.message })
    }
  }

  if (type === 'GENERATE') {
    if (!engine) {
      self.postMessage({ type: 'ERROR', id, error: 'Engine not ready' })
      return
    }

    try {
      const reply = await engine.chat.completions.create({
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ],
        max_tokens: 80,
        temperature: 0.8
      })

      const text = reply.choices?.[0]?.message?.content?.trim() || ''
      self.postMessage({ type: 'NARRATIVE', id, text })
    } catch (err) {
      console.error('[LLM Worker] Generation failed:', err)
      self.postMessage({ type: 'ERROR', id, error: err.message })
    }
  }
}
