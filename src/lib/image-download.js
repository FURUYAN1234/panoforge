const PNG = 'image/png';

export function canvasImageBlob(canvas, mimeType, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob?.type === mimeType && blob.size > 0) resolve(blob);
      else reject(new Error('画像をファイル形式に変換できませんでした。'));
    }, mimeType, quality);
  });
}

export async function imageDataAsPng(dataUrl) {
  const match = /^data:image\/[\w.+-]+;base64,([\s\S]+)$/i.exec(dataUrl);
  if (!match) throw new Error('保存する画像データを読み込めませんでした。');
  const binary = atob(match[1]);
  if (binary.startsWith('\x89PNG\r\n\x1a\n')) {
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
    return new Blob([bytes], { type: PNG });
  }

  const image = new Image();
  image.src = dataUrl;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('PNG画像を作成できませんでした。');
  context.drawImage(image, 0, 0);
  return canvasImageBlob(canvas, PNG);
}

export function saveImageBlob(blob, filename) {
  if (!blob?.size) throw new Error('保存できる画像データがありません。');
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  try {
    link.hidden = true;
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
  } finally {
    link.remove();
    // The browser acquires the blob after click dispatch.
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
}
