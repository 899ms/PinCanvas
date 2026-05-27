import { useEffect, useState } from 'react';
import { Canvas } from '@/canvas/Canvas';
import { createInputImageFromDataURL } from '@/canvas/factory';
import { Header } from '@/components/Header';
import { SettingsDrawer } from '@/components/SettingsDrawer';
import { Toolbar, type WorkspacePanel } from '@/components/Toolbar';
import {
  hydrateCanvas,
  useCanvas,
  useTemporal,
  type CanvasState,
} from '@/store/canvas';
import { useHistory } from '@/store/history';
import { useLibrary } from '@/store/library';
import { loadSnapshot, saveSnapshot } from '@/store/persistence';
import { getPref } from '@/store/prefs';
import { useVideoTaskRecovery } from '@/hooks/useVideoTaskRecovery';
import { debounce } from '@/utils/debounce';
import { fileToDataURL } from '@/utils/image';

function isEditableTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  const tag = t.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || t.isContentEditable;
}

export default function App() {
  const addNode = useCanvas((s) => s.addNode);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<WorkspacePanel>(null);
  const historyCount = useHistory((s) => s.entries.length);
  useVideoTaskRecovery();

  // 启动时把 character/scene library + 生成历史从 IDB 拉一次
  useEffect(() => {
    void useLibrary.getState().hydrate();
    void useHistory.getState().hydrate();
  }, []);

  // autosave + hydrate（hydrate 完才订阅，避免空状态覆盖快照）
  useEffect(() => {
    let cancelled = false;
    let unsub: (() => void) | null = null;
    const save = debounce((state: CanvasState) => {
      void saveSnapshot({
        version: 1,
        savedAt: Date.now(),
        projectName: getPref('project_name', 'untitled'),
        nodes: state.nodes,
        edges: state.edges,
      });
    }, 1500);

    void loadSnapshot()
      .then((snap) => {
        if (cancelled) return;
        if (snap) hydrateCanvas({ nodes: snap.nodes, edges: snap.edges });
        unsub = useCanvas.subscribe((s, prev) => {
          if (s.nodes === prev.nodes && s.edges === prev.edges) return;
          save(s);
        });
      })
      .catch(() => {
        /* idb 不可用：放弃自动保存 */
      });

    return () => {
      cancelled = true;
      save.cancel();
      unsub?.();
    };
  }, []);

  // Cmd/Ctrl + Z → undo；Shift+Cmd/Ctrl+Z 或 Cmd/Ctrl+Y → redo
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (isEditableTarget(e.target)) return;
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        useTemporal.getState().undo();
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        e.preventDefault();
        useTemporal.getState().redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // 全局粘贴图片 → 创建 InputImageNode
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (isEditableTarget(e.target)) return;
      if (!e.clipboardData) return;
      for (const item of Array.from(e.clipboardData.items)) {
        if (!item.type.startsWith('image/')) continue;
        const file = item.getAsFile();
        if (!file) continue;
        e.preventDefault();
        void fileToDataURL(file).then((dataUrl) => {
          addNode(
            createInputImageFromDataURL(dataUrl, file.name || 'pasted.png', {
              x: 120,
              y: 100,
            }),
          );
        });
        return;
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [addNode]);

  return (
    <div className="flex h-screen w-screen flex-col bg-canvas-bg">
      <Header
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenHistory={() =>
          setActivePanel((panel) => (panel === 'history' ? null : 'history'))
        }
        historyCount={historyCount}
      />
      <div className="flex min-h-0 flex-1">
        <Toolbar
          activePanel={activePanel}
          onChangePanel={setActivePanel}
          historyCount={historyCount}
        />
        <main className="relative min-w-0 flex-1">
          <Canvas />
        </main>
      </div>
      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
