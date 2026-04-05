import { useCallback, useMemo } from 'react'
import '@excalidraw/excalidraw/index.css'
import { Excalidraw, restoreAppState, restoreElements } from '@excalidraw/excalidraw'

function toPersistableScene(elements: readonly unknown[], appState: object): Record<string, unknown> {
  try {
    return JSON.parse(JSON.stringify({ elements: [...elements], appState: { ...appState } })) as Record<
      string,
      unknown
    >
  } catch {
    return { elements: [], appState: {} }
  }
}

type TeamExcalidrawCanvasProps = {
  rawContent: Record<string, unknown>
  onSceneChange: (payload: Record<string, unknown>) => void
}

export function TeamExcalidrawCanvas({ rawContent, onSceneChange }: TeamExcalidrawCanvasProps) {
  const initialData = useMemo(() => {
    const elementsUnknown = rawContent.elements
    const elements = Array.isArray(elementsUnknown) ? elementsUnknown : []
    const appUnknown = rawContent.appState
    const appState =
      appUnknown && typeof appUnknown === 'object' && !Array.isArray(appUnknown) ? appUnknown : {}
    return {
      elements: restoreElements(elements as never, null),
      appState: restoreAppState(appState as never, null),
    }
  }, [rawContent])

  const handleChange = useCallback(
    (elements: readonly unknown[], appState: object, _files: unknown) => {
      onSceneChange(toPersistableScene(elements, appState))
    },
    [onSceneChange],
  )

  return (
    <div
      style={{
        height: '100%',
        width: '100%',
      }}
      className="team-excalidraw-root"
    >
      <Excalidraw initialData={initialData} onChange={handleChange} />
    </div>
  )
}
