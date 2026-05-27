import { Clock, LayoutPanelLeft, MousePointer2, Users, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import { libraryId, useLibrary } from '@/store/library';
import { getPref, setPref } from '@/store/prefs';
import { AddNodeMenu } from './AddNodeMenu';
import { HistoryDrawer } from './HistoryDrawer';

export type WorkspacePanel = 'add' | 'history' | 'library' | null;

interface Props {
  activePanel: WorkspacePanel;
  onChangePanel: (panel: WorkspacePanel | ((panel: WorkspacePanel) => WorkspacePanel)) => void;
  historyCount: number;
}

export function Toolbar({ activePanel, onChangePanel, historyCount }: Props) {
  const [panelWidth, setPanelWidth] = useState(() =>
    clampPanelWidth(Number(getPref('workspace_panel_width', 420)) || 420),
  );
  const toggle = (panel: Exclude<WorkspacePanel, null>) => {
    onChangePanel((current) => (current === panel ? null : panel));
  };
  const setWidth = useCallback((next: number) => {
    const width = clampPanelWidth(next);
    setPanelWidth(width);
    setPref('workspace_panel_width', width);
  }, []);

  return (
    <>
      <aside className="flex w-[72px] shrink-0 flex-col items-center gap-5 border-r border-zinc-200 bg-white px-2 py-7">
        <SidebarBtn
          active={activePanel === 'add'}
          onClick={() => toggle('add')}
          title="节点库"
        >
          <LayoutPanelLeft className="h-5 w-5" />
        </SidebarBtn>
        <SidebarBtn active={false} onClick={() => onChangePanel(null)} title="选择">
          <MousePointer2 className="h-5 w-5" />
        </SidebarBtn>
        <SidebarBtn
          active={activePanel === 'history'}
          onClick={() => toggle('history')}
          title={`生成历史${historyCount > 0 ? ` (${historyCount})` : ''}`}
        >
          <Clock className="h-5 w-5" />
        </SidebarBtn>
        <SidebarBtn
          active={activePanel === 'library'}
          onClick={() => toggle('library')}
          title="角色场景"
        >
          <Users className="h-5 w-5" />
        </SidebarBtn>
      </aside>
      {activePanel === 'add' && (
        <ResizablePanel width={panelWidth} onResize={setWidth}>
          <AddNodeMenu onClose={() => onChangePanel(null)} />
        </ResizablePanel>
      )}
      {activePanel === 'history' && (
        <ResizablePanel width={panelWidth} onResize={setWidth}>
          <HistoryDrawer onClose={() => onChangePanel(null)} />
        </ResizablePanel>
      )}
      {activePanel === 'library' && (
        <ResizablePanel width={panelWidth} onResize={setWidth}>
          <LibraryPanel onClose={() => onChangePanel(null)} />
        </ResizablePanel>
      )}
    </>
  );
}

function clampPanelWidth(width: number): number {
  return Math.min(640, Math.max(340, Math.round(width)));
}

function ResizablePanel({
  width,
  onResize,
  children,
}: {
  width: number;
  onResize: (width: number) => void;
  children: React.ReactNode;
}) {
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const startX = e.clientX;
    const startWidth = width;
    const onMove = (ev: PointerEvent) => {
      onResize(startWidth + ev.clientX - startX);
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
  };

  return (
    <div
      className="relative flex shrink-0 border-r border-zinc-200 bg-white"
      style={{ width }}
    >
      <div className="min-w-0 flex-1">{children}</div>
      <div
        className="absolute -right-1 top-0 z-10 h-full w-2 cursor-col-resize"
        onPointerDown={onPointerDown}
        role="separator"
        aria-orientation="vertical"
        aria-label="调整面板宽度"
        title="拖拽调整面板宽度"
      >
        <div className="mx-auto h-full w-px bg-transparent transition-colors hover:bg-blue-400" />
      </div>
    </div>
  );
}

function LibraryPanel({ onClose }: { onClose: () => void }) {
  const characters = useLibrary((s) => s.characters);
  const scenes = useLibrary((s) => s.scenes);
  const upsertCharacter = useLibrary((s) => s.upsertCharacter);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  const createCharacter = () => {
    const trimmed = name.trim() || '未命名角色';
    void upsertCharacter({
      id: libraryId('char'),
      name: trimmed,
      description: '',
      createdAt: Date.now(),
    });
    setName('');
    setCreating(false);
  };

  return (
    <aside className="flex h-full min-w-0 flex-col bg-white">
      <div className="flex h-[76px] shrink-0 items-center justify-between border-b border-zinc-200 px-5">
        <h2 className="text-[15px] font-semibold leading-5 text-zinc-900">角色和场景库</h2>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="rounded-md bg-blue-500 px-3.5 py-2 text-[13px] font-semibold leading-none text-white hover:bg-blue-600"
            onClick={() => setCreating(true)}
          >
            新建角色
          </button>
          <button
            type="button"
            className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            onClick={onClose}
            aria-label="关闭角色库"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {creating && (
        <div className="flex shrink-0 items-center gap-2 border-b border-zinc-200 px-6 py-4">
          <input
            className="min-w-0 flex-1 rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') createCharacter();
              if (e.key === 'Escape') setCreating(false);
            }}
            placeholder="角色名称"
            autoFocus
          />
          <button
            type="button"
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            onClick={createCharacter}
          >
            创建
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {characters.length === 0 && scenes.length === 0 ? (
          <div className="flex h-full items-start justify-center px-8 pt-24 text-center text-[13px] font-medium leading-6 text-zinc-400">
            暂无角色和场景，点击"新建角色"开始创建
          </div>
        ) : (
          <div className="space-y-6 p-6">
            {characters.length > 0 && (
              <LibrarySection title={`角色 (${characters.length})`}>
                {characters.map((character) => (
                  <LibraryCard
                    key={character.id}
                    name={character.name}
                    description={character.description || '暂无描述'}
                    imageUrl={character.imageUrl}
                  />
                ))}
              </LibrarySection>
            )}
            {scenes.length > 0 && (
              <LibrarySection title={`场景 (${scenes.length})`}>
                {scenes.map((scene) => (
                  <LibraryCard
                    key={scene.id}
                    name={scene.name}
                    description={scene.description || '暂无描述'}
                    imageUrl={scene.imageUrl}
                  />
                ))}
              </LibrarySection>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

function LibrarySection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-3 text-xs font-semibold leading-4 text-zinc-500">{title}</h3>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-3">
        {children}
      </ul>
    </section>
  );
}

function LibraryCard({
  name,
  description,
  imageUrl,
}: {
  name: string;
  description: string;
  imageUrl?: string;
}) {
  return (
    <li className="rounded-lg border border-zinc-200 bg-white p-3">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-[13px] font-semibold text-zinc-500">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="h-full w-full rounded-md object-cover" />
          ) : (
            name.slice(0, 1)
          )}
        </div>
        <div className="min-w-0">
          <div className="truncate text-[13px] font-medium leading-5 text-zinc-800">{name}</div>
          <div className="mt-0.5 truncate text-xs text-zinc-400">{description}</div>
        </div>
      </div>
    </li>
  );
}

interface SidebarBtnProps {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}

function SidebarBtn({ active, onClick, title, children }: SidebarBtnProps) {
  return (
    <button
      type="button"
      className={`group relative flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${
        active
          ? 'bg-zinc-200 text-zinc-950'
          : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 active:bg-zinc-200'
      }`}
      onClick={onClick}
      aria-label={title}
      title={title}
    >
      {children}
      {!active && (
        <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md bg-zinc-900 px-2 py-0.5 text-[11px] font-medium text-white opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100">
          {title}
        </span>
      )}
    </button>
  );
}
