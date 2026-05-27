import type { NodeId } from './node';

export interface AppEdge {
  id: string;
  from: NodeId;
  to: NodeId;
  /** 图片对比节点出边选择的参考图；为空或未定义时按默认上游规则处理。 */
  referenceImageUrls?: string[];
}
