import type { ExpressionType } from '@/types/node';

export interface CharacterCardLayout {
  viewType: 'three' | 'four';
  expressions: ExpressionType[];
  layout: 'classic' | 'compact';
  imageSize: number;
  spacing: number;
  addLabels: boolean;
}

interface CompositeInput {
  multiViewImage: string;
  expressionImages: Record<ExpressionType, string>;
  layout: CharacterCardLayout;
}

const EXPRESSION_LABELS: Record<ExpressionType, string> = {
  happy: '开心',
  sad: '悲伤',
  angry: '愤怒',
  surprised: '惊讶',
  neutral: '平静',
  excited: '兴奋',
  worried: '担心',
  shy: '害羞',
};

/**
 * 加载图片为 HTMLImageElement
 * 通过后端代理避免 CORS 问题
 */
async function loadImage(url: string): Promise<HTMLImageElement> {
  // 如果是外部 URL，通过后端代理
  const proxyUrl = url.startsWith('http')
    ? `/api/user/media/library/blob?url=${encodeURIComponent(url)}`
    : url;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => {
      console.error('图片加载失败:', proxyUrl, err);
      reject(new Error(`图片加载失败: ${url}`));
    };
    img.src = proxyUrl;
  });
}

/**
 * 合成角色卡图片
 */
export async function composeCharacterCard(input: CompositeInput): Promise<string> {
  const { multiViewImage, expressionImages, layout } = input;
  const { viewType, expressions, layout: layoutType, imageSize, spacing, addLabels } = layout;

  // 加载所有图片
  const multiViewImg = await loadImage(multiViewImage);
  const expressionImgs = await Promise.all(
    expressions.map(async (expr) => ({
      type: expr,
      img: await loadImage(expressionImages[expr]),
    })),
  );

  if (layoutType === 'classic') {
    return composeClassicLayout(multiViewImg, expressionImgs, {
      viewType,
      imageSize,
      spacing,
      addLabels,
    });
  } else {
    return composeCompactLayout(multiViewImg, expressionImgs, {
      viewType,
      imageSize,
      spacing,
      addLabels,
    });
  }
}

/**
 * 经典布局：多视图在上，表情在下
 */
async function composeClassicLayout(
  multiViewImg: HTMLImageElement,
  expressionImgs: Array<{ type: ExpressionType; img: HTMLImageElement }>,
  options: { viewType: 'three' | 'four'; imageSize: number; spacing: number; addLabels: boolean },
): Promise<string> {
  const { imageSize, spacing, addLabels } = options;
  const labelHeight = addLabels ? 24 : 0;

  // 计算多视图区域尺寸
  const multiViewWidth = multiViewImg.width;
  const multiViewHeight = multiViewImg.height;

  // 计算表情区域布局（2列或3列）
  const cols = expressionImgs.length <= 4 ? 2 : 3;
  const rows = Math.ceil(expressionImgs.length / cols);
  const exprWidth = cols * imageSize + (cols - 1) * spacing;
  const exprHeight = rows * (imageSize + labelHeight) + (rows - 1) * spacing;

  // 计算画布总尺寸
  const canvasWidth = Math.max(multiViewWidth, exprWidth) + spacing * 2;
  const canvasHeight = multiViewHeight + exprHeight + spacing * 3;

  // 创建画布
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法创建 Canvas 上下文');

  // 填充白色背景
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // 绘制多视图（居中）
  const multiViewX = (canvasWidth - multiViewWidth) / 2;
  ctx.drawImage(multiViewImg, multiViewX, spacing, multiViewWidth, multiViewHeight);

  // 绘制表情
  const exprStartY = spacing + multiViewHeight + spacing;
  const exprStartX = (canvasWidth - exprWidth) / 2;

  expressionImgs.forEach((item, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = exprStartX + col * (imageSize + spacing);
    const y = exprStartY + row * (imageSize + labelHeight + spacing);

    // 绘制表情图片
    ctx.drawImage(item.img, x, y, imageSize, imageSize);

    // 绘制标签
    if (addLabels) {
      ctx.fillStyle = '#52525b';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(EXPRESSION_LABELS[item.type], x + imageSize / 2, y + imageSize + 4);
    }
  });

  return canvas.toDataURL('image/png');
}

/**
 * 紧凑布局：多视图在左，表情在右
 */
async function composeCompactLayout(
  multiViewImg: HTMLImageElement,
  expressionImgs: Array<{ type: ExpressionType; img: HTMLImageElement }>,
  options: { viewType: 'three' | 'four'; imageSize: number; spacing: number; addLabels: boolean },
): Promise<string> {
  const { imageSize, spacing, addLabels } = options;
  const labelHeight = addLabels ? 24 : 0;

  // 计算多视图区域尺寸（竖向排列，缩小）
  const multiViewScale = 0.8;
  const multiViewWidth = multiViewImg.width * multiViewScale;
  const multiViewHeight = multiViewImg.height * multiViewScale;

  // 计算表情区域布局（2列）
  const cols = 2;
  const rows = Math.ceil(expressionImgs.length / cols);
  const exprWidth = cols * imageSize + spacing;
  const exprHeight = rows * (imageSize + labelHeight) + (rows - 1) * spacing;

  // 计算画布总尺寸
  const canvasWidth = multiViewWidth + exprWidth + spacing * 3;
  const canvasHeight = Math.max(multiViewHeight, exprHeight) + spacing * 2;

  // 创建画布
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法创建 Canvas 上下文');

  // 填充白色背景
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // 绘制多视图（左侧，垂直居中）
  const multiViewY = (canvasHeight - multiViewHeight) / 2;
  ctx.drawImage(multiViewImg, spacing, multiViewY, multiViewWidth, multiViewHeight);

  // 绘制表情（右侧，垂直居中）
  const exprStartX = spacing + multiViewWidth + spacing;
  const exprStartY = (canvasHeight - exprHeight) / 2;

  expressionImgs.forEach((item, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = exprStartX + col * (imageSize + spacing);
    const y = exprStartY + row * (imageSize + labelHeight + spacing);

    // 绘制表情图片
    ctx.drawImage(item.img, x, y, imageSize, imageSize);

    // 绘制标签
    if (addLabels) {
      ctx.fillStyle = '#52525b';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(EXPRESSION_LABELS[item.type], x + imageSize / 2, y + imageSize + 4);
    }
  });

  return canvas.toDataURL('image/png');
}
