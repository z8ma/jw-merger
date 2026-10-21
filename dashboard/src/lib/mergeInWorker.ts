import type { HighlightChoices } from '../types'
import type { MergeResult } from './merge'
import type { MergeRequest, MergeResponse } from './merge.worker'

// Lance la fusion hors du thread principal pour que l'interface reste réactive.
export function mergeInWorker(
  fileA: File,
  fileB: File,
  onProgress: (step: string) => void,
  choices: HighlightChoices,
  signal?: AbortSignal,
): Promise<MergeResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./merge.worker.ts', import.meta.url), { type: 'module' })
    const finish = (settle: () => void) => {
      worker.terminate()
      settle()
    }

    worker.onmessage = (e: MessageEvent<MergeResponse>) => {
      const msg = e.data
      if (msg.type === 'progress') onProgress(msg.step)
      else if (msg.type === 'done') finish(() => resolve(msg.result))
      else finish(() => reject(new Error(msg.message)))
    }
    worker.onerror = e => finish(() => reject(new Error(e.message || 'Le traitement de fusion s’est arrêté de façon inattendue')))
    signal?.addEventListener('abort', () => finish(() => reject(new DOMException('Fusion annulée', 'AbortError'))))

    const request: MergeRequest = { fileA, fileB, choices }
    worker.postMessage(request)
  })
}
