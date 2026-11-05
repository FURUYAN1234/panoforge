// A normal input photo is a perspective view, not a stretched panorama.
// Without lens metadata, use a level camera and a 90-degree horizontal field of view.
export function projectPerspectiveReference(source, { width = 2048, height = 1024, horizontalFov = 90 } = {}) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width !== 2 * height || height < 2
    || !Number.isInteger(source.width) || !Number.isInteger(source.height)
    || source.width < 2 || source.height < 2 || source.data?.length !== source.width * source.height * 4
    || !Number.isFinite(horizontalFov) || horizontalFov <= 0 || horizontalFov >= 180) {
    throw new Error('Invalid perspective reference or 2:1 panorama dimensions.');
  }
  const image = new Uint8ClampedArray(width * height * 4);
  const mask = new Uint8ClampedArray(image.length);
  const anchor = new Uint8ClampedArray(image.length);
  const focal = source.width / (2 * Math.tan(horizontalFov * Math.PI / 360));
  const feather = Math.max(1, source.width * 0.015);
  for (let y = 0; y < height; y++) {
    const latitude = (0.5 - (y + 0.5) / height) * Math.PI;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      image.set([128, 128, 128, 255], i);
      const longitude = ((x + 0.5) / width - 0.5) * 2 * Math.PI;
      const forward = Math.cos(longitude);
      if (forward <= 0) continue;
      const sx = (source.width - 1) / 2 + focal * Math.tan(longitude);
      const sy = (source.height - 1) / 2 - focal * Math.tan(latitude) / forward;
      if (sx < 0 || sy < 0 || sx > source.width - 1 || sy > source.height - 1) continue;
      const x0 = Math.floor(sx), y0 = Math.floor(sy);
      const x1 = Math.min(x0 + 1, source.width - 1), y1 = Math.min(y0 + 1, source.height - 1);
      const dx = sx - x0, dy = sy - y0;
      for (let c = 0; c < 4; c++) {
        const top = source.data[(y0 * source.width + x0) * 4 + c] * (1 - dx)
          + source.data[(y0 * source.width + x1) * 4 + c] * dx;
        const bottom = source.data[(y1 * source.width + x0) * 4 + c] * (1 - dx)
          + source.data[(y1 * source.width + x1) * 4 + c] * dx;
        anchor[i + c] = top * (1 - dy) + bottom * dy;
      }
      const edgeDistance = Math.min(sx, sy, source.width - 1 - sx, source.height - 1 - sy);
      const sourceAlpha = anchor[i + 3];
      for (let c = 0; c < 3; c++) image[i + c] = anchor[i + c] * sourceAlpha / 255 + 128 * (1 - sourceAlpha / 255);
      anchor[i + 3] = sourceAlpha * Math.min(1, edgeDistance / feather);
      // Fully protect observed pixels; let the model complete the narrow boundary too.
      mask[i + 3] = anchor[i + 3] === 255 ? 255 : 0;
    }
  }
  return { width, height, image, mask, anchor };
}

// Inspect the sphere in the same perspective geometry as the interactive viewer.
// Horizontal sampling wraps, so the back view exposes the actual 0/360 boundary.
export function projectPanoramaView(source, { width = 1024, height = 1024, yaw = 180, horizontalFov = 90 } = {}) {
  if (!Number.isInteger(source.width) || !Number.isInteger(source.height)
    || source.width !== source.height * 2 || source.height < 2
    || source.data?.length !== source.width * source.height * 4
    || !Number.isInteger(width) || !Number.isInteger(height) || width < 2 || height < 2
    || !Number.isFinite(yaw) || !Number.isFinite(horizontalFov) || horizontalFov <= 0 || horizontalFov >= 180) {
    throw new Error('Invalid panorama view dimensions or field of view.');
  }
  const data = new Uint8ClampedArray(width * height * 4);
  const tangent = Math.tan(horizontalFov * Math.PI / 360);
  const angle = yaw * Math.PI / 180;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const rx = (2 * (x + 0.5) / width - 1) * tangent;
    const ry = (1 - 2 * (y + 0.5) / height) * tangent * height / width;
    const longitude = Math.atan2(rx, 1) + angle;
    const latitude = Math.atan2(ry, Math.hypot(rx, 1));
    const rawX = (longitude / (2 * Math.PI) + 0.5) * source.width - 0.5;
    const sx = ((rawX % source.width) + source.width) % source.width;
    const sy = Math.max(0, Math.min(source.height - 1, (0.5 - latitude / Math.PI) * source.height - 0.5));
    const x0 = Math.floor(sx), x1 = (x0 + 1) % source.width;
    const y0 = Math.floor(sy), y1 = Math.min(y0 + 1, source.height - 1);
    const dx = sx - x0, dy = sy - y0;
    for (let c = 0; c < 4; c++) {
      const top = source.data[(y0 * source.width + x0) * 4 + c] * (1 - dx) + source.data[(y0 * source.width + x1) * 4 + c] * dx;
      const bottom = source.data[(y1 * source.width + x0) * 4 + c] * (1 - dx) + source.data[(y1 * source.width + x1) * 4 + c] * dx;
      data[(y * width + x) * 4 + c] = top * (1 - dy) + bottom * dy;
    }
  }
  return { width, height, data };
}
