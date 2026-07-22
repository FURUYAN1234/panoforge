export function resetGenerationStateForProviderChange(state) {
  Object.assign(state, {
    inputImageBase64: null,
    inputImageMime: null,
    panoBase64: null,
    panoMime: null,
    panoDataUrl: null,
    generatedDataUrl: null,
    lastAction: null,
    pendingPanoDataUrl: null,
    pendingPanoFile: null,
    isDirectView: false,
  });
}
