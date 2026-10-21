import { mergeBackups } from './merge'
import type { MergeResult } from './merge'
import type { HighlightChoices } from '../types'

export interface MergeRequest {
  fileA: File
  fileB: File
  choices: HighlightChoices
}

export type MergeResponse =
  | { type: 'progress'; step: string }
  | { type: 'done'; result: MergeResult }
  | { type: 'error'; message: string }

const send = (msg: MergeResponse) => self.postMessage(msg)

self.onmessage = async (e: MessageEvent<MergeRequest>) => {
  const { fileA, fileB, choices } = e.data
  try {
    const result = await mergeBackups(fileA, fileB, p => send({ type: 'progress', step: p.step }), choices)
    send({ type: 'done', result })
  } catch (err) {
    send({ type: 'error', message: err instanceof Error ? err.message : String(err) })
  }
}
