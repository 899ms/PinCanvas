import { afterEach, describe, expect, it } from 'vitest';
import type { BackgroundVideoTask } from '@/api/video-tasks';
import type { GenVideoNode, NodeId } from '@/types/node';
import { useCanvas } from '@/store/canvas';
import { useHistory } from '@/store/history';
import { applyRecoveredVideoTask } from '../useVideoTaskRecovery';

const id = (value: string) => value as NodeId;

function genVideoNode(content?: string): GenVideoNode {
  return {
    id: id('video-node'),
    kind: 'gen-video',
    x: 0,
    y: 0,
    width: 320,
    height: 360,
    content,
    settings: {
      model: 'wan2.6-r2v-flash',
      videoPrompt: '',
      duration: '5s',
      ratio: '16:9',
      resolution: '720p',
      videoMode: 'first-last-frame',
      referenceImages: [],
    },
  };
}

function completedTask(resultUrl: string): BackgroundVideoTask {
  return {
    id: 'task-1',
    clientId: 'client-1',
    nodeId: 'video-node',
    historyEntryId: 'history-1',
    model: 'wan2.6-r2v-flash',
    baseUrl: 'https://example.com',
    endpoint: '/v1/video/generations',
    body: {},
    async: true,
    status: 'completed',
    tokenHash: 'token',
    resultUrl,
    createdAt: 100,
    updatedAt: 200,
    completedAt: 200,
  };
}

describe('applyRecoveredVideoTask', () => {
  afterEach(() => {
    useCanvas.getState().clear();
    useHistory.setState({ entries: [] });
  });

  it('does not recreate a preview after the completed result is already on the source node', () => {
    useCanvas.getState().addNode(genVideoNode('https://example.com/video.mp4'));

    applyRecoveredVideoTask(completedTask('https://example.com/video.mp4'));

    expect(useCanvas.getState().nodes).toHaveLength(1);
    expect(useCanvas.getState().edges).toHaveLength(0);
  });

  it('creates one preview the first time a completed result is recovered', () => {
    useCanvas.getState().addNode(genVideoNode());

    applyRecoveredVideoTask(completedTask('https://example.com/video.mp4'));

    const nodes = useCanvas.getState().nodes;
    expect(nodes).toHaveLength(2);
    expect(nodes[0].content).toBe('https://example.com/video.mp4');
    expect(nodes[1]).toMatchObject({
      kind: 'preview',
      settings: { previewType: 'video', content: 'https://example.com/video.mp4' },
    });
    expect(useCanvas.getState().edges).toHaveLength(1);
  });
});
