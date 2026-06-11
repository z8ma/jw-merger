import { useState, useCallback, useEffect } from 'react'
import { Hero } from './components/HomePage'
import { Landing } from './components/UploadPage'
import { Dashboard } from './components/AnalysisPage'
import { parseBackup } from './lib/parseBackup'
import { compareBackups } from './lib/compare'
import type { BackupData, Comparison } from './types'

interface LoadedState {
  fileA: File
  fileB: File
  backupA: BackupData
  backupB: BackupData
  comparison: Comparison
}

export default function App() {
  const [fileA, setFileA]     = useState<File | null>(null)
  const [fileB, setFileB]     = useState<File | null>(null)
  const [backupA, setBackupA] = useState<BackupData | null>(null)
  const [backupB, setBackupB] = useState<BackupData | null>(null)
  const [screen, setScreen]   = useState<'home' | 'merger'>('home')
  const [loaded, setLoaded]   = useState<LoadedState | null>(null)
  const [loadingSlot, setLoadingSlot] = useState<'a' | 'b' | null>(null)
  const [error, setError]     = useState<string | null>(null)

  const loadFile = useCallback(async (file: File, slot: 'a' | 'b') => {
    setLoadingSlot(slot)
    setError(null)
    try {
      const data = await parseBackup(file)
      if (slot === 'a') { setFileA(file); setBackupA(data) }
      else              { setFileB(file); setBackupB(data) }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoadingSlot(null)
    }
  }, [])

  const handleCompare = useCallback(() => {
    if (!backupA || !backupB || !fileA || !fileB) return
    setLoaded({ fileA, fileB, backupA, backupB, comparison: compareBackups(backupA, backupB) })
  }, [backupA, backupB, fileA, fileB])

  useEffect(() => {
    const handlePop = () => {
      setLoaded(null)
      setError(null)
      setScreen('home')
    }
    window.addEventListener('popstate', handlePop)
    return () => window.removeEventListener('popstate', handlePop)
  }, [])

  const handleReset = () => {
    setLoaded(null)
    setError(null)
  }

  const goToMerger = () => {
    window.history.pushState({ screen: 'merger' }, '')
    setScreen('merger')
  }

  if (screen === 'home') {
    return <Hero onStart={goToMerger} />
  }

  if (loaded) {
    return (
      <Dashboard
        backupA={loaded.backupA}
        backupB={loaded.backupB}
        comparison={loaded.comparison}
        fileA={loaded.fileA}
        fileB={loaded.fileB}
        onReset={handleReset}
      />
    )
  }

  return (
    <Landing
      backupA={backupA}
      backupB={backupB}
      loadingSlot={loadingSlot}
      error={error}
      onFileA={f => loadFile(f, 'a')}
      onFileB={f => loadFile(f, 'b')}
      onCompare={handleCompare}
      onBack={() => window.history.back()}
    />
  )
}
