import { useEffect } from 'react';
import {
  getVideoTaskClientId,
  listBackgroundVideoTasks,
  resumeBackgroundVideoTask,
  type BackgroundVideoTask,
} from '@/api/video-tasks';
import { createVideoPreviewNode } from '@/canvas/factory';
import { getResultNodePosition } from '@/canvas/resultLayout';
import { useCanvas } from '@/store/canvas';
import { useHistory } from '@/store/history';
import { getPref } from '@/store/prefs';
import type { NodeId } from '@/types/node';
import { edgeId } from '@/utils/id';

const SYNC_INTERVAL_MS = 8_000;

export function useVideoTaskRecovery(): void {
  useEffect(() => {
    let cancelled = false;

    const sync = async () => {
      try {
        const clientId = getVideoTaskClientId();
        const tasks = await listBackgroundVideoTasks(clientId);
        if (cancelled) return;
        const apiKey = String(getPref('global_key', ''));
        for (const task of tasks) {
          let current = task;
          if (current.status === 'awaiting_auth' && apiKey) {
            try {
              current = await resumeBackgroundVideoTask(current.id, apiKey);
            } catch {
              /* Token may not match the original task; leave awaiting_auth. */
            }
          }
          applyRecoveredVideoTask(current);
        }
      } catch {
        /* Background task service may be offline in static-only deployments. */
      }
    };

    void sync();
    const timer = window.setInterval(() => void sync(), SYNC_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);
}

export function applyRecoveredVideoTask(task: BackgroundVideoTask): void {
  if (task.status === 'completed' && task.resultUrl) {
    applyCompletedTask(task);
    return;
  }
  if (task.status === 'failed') {
    applyFailedTask(task);
  }
}

function applyCompletedTask(task: BackgroundVideoTask): void {
  const content = task.resultUrl;
  if (!content) return;
  const history = useHistory.getState();
  if (task.historyEntryId) {
    void history.update(task.historyEntryId, {
      status: 'completed',
      content,
      model: task.model,
      durationMs: task.completedAt ? task.completedAt - task.createdAt : undefined,
    });
  }

  const canvas = useCanvas.getState();
  const source = canvas.nodes.find((n) => n.id === task.nodeId);
  if (!source) return;
  const alreadyApplied =
    source.content === content ||
    history.entries.some(
      (entry) =>
        entry.nodeId === task.nodeId &&
        entry.kind === 'video' &&
        entry.status === 'completed' &&
        entry.content === content,
    );
  canvas.patchNode(task.nodeId as NodeId, { content });
  if (alreadyApplied) return;

  const hasPreview = canvas.edges.some((edge) => {
    if (edge.from !== task.nodeId) return false;
    const target = canvas.nodes.find((node) => node.id === edge.to);
    return (
      target?.kind === 'preview' &&
      target.settings.previewType === 'video' &&
      target.settings.content === content
    );
  });
  if (hasPreview) return;

  const preview = createVideoPreviewNode(content, { x: 0, y: 0 });
  const pos = getResultNodePosition(
    source,
    canvas.nodes,
    canvas.edges,
    'preview',
    preview.width,
    preview.height,
  );
  preview.x = pos.x;
  preview.y = pos.y;
  canvas.addNode(preview);
  canvas.addEdge({ id: edgeId(), from: source.id, to: preview.id });
}

function applyFailedTask(task: BackgroundVideoTask): void {
  if (!task.historyEntryId) return;
  void useHistory.getState().update(task.historyEntryId, {
    status: 'failed',
    model: task.model,
    error: task.error || '后台视频任务失败',
    durationMs: task.completedAt ? task.completedAt - task.createdAt : undefined,
  });
}
