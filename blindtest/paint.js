/* ==========================================================================
   Paint editor used by the drawing mode: a small Photoshop / Clip Studio
   style editor built into a container element.
   - Tools: brush, eraser, bucket, magic wand, eyedropper, line, rectangle, ellipse
   - Layers (add / delete / reorder / hide / opacity), selection (magic wand)
     that clips painting, undo / redo, free color picker + palette + recent colors
   - Graphics tablets: pen pressure changes the brush width, the pen's
     eraser end erases
   - Shortcuts: Ctrl+Z / Ctrl+Y, B E G W I L R O, [ ], mouse wheel = size,
     Shift+wheel = opacity, Alt+click = eyedropper, Ctrl+A / Ctrl+D /
     Ctrl+Shift+I, Delete, X = previous color, Ctrl+Shift+N = new layer
   Uses t() from app.js for its labels.
   ========================================================================== */

function createPaintEditor(container) {
  const W = 960;
  const H = 720;
  const MAX_LAYERS = 8;
  const MAX_HISTORY = 30;
  const PALETTE = [
    '#000000', '#404040', '#808080', '#c0c0c0', '#ffffff', '#6b3a1e', '#a0522d', '#f2c9a0',
    '#e6231e', '#ff6b6b', '#ff8c1a', '#ffd21a', '#fff38a', '#3adf3a', '#1a9e4b', '#0b5d2a',
    '#1ab8ff', '#2a4bff', '#10205e', '#8a3cff', '#c89bff', '#ff5cc8', '#ffb3de', '#7a0a3c',
  ];
  const TOOLS = [
    { id: 'brush', icon: '🖌️', key: 'b' },
    { id: 'eraser', icon: '🧽', key: 'e' },
    { id: 'bucket', icon: '🪣', key: 'g' },
    { id: 'wand', icon: '🪄', key: 'w' },
    { id: 'picker', icon: '💧', key: 'i' },
    { id: 'line', icon: '╱', key: 'l' },
    { id: 'rect', icon: '▭', key: 'r' },
    { id: 'ellipse', icon: '◯', key: 'o' },
  ];

  const state = {
    tool: 'brush',
    color: '#000000',
    previousColor: '#ffffff',
    recent: [],
    size: 8,
    opacity: 1,
    tolerance: 32,
    sampleAll: false,
    fillShapes: false,
    layers: [],
    current: 0,
    nextLayerNumber: 1,
    hasSelection: false,
    undo: [],
    redo: [],
    enabled: false,
    stroke: null,
    renderQueued: false,
    liveTimer: null,
    onLiveFrame: null,
    onChange: null,
  };

  const make = (tag, className, parent) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (parent) parent.appendChild(node);
    return node;
  };
  const makeCanvas = () => {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    return c;
  };

  /* ---------- DOM ---------- */

  container.innerHTML = '';
  const root = make('div', 'paint', container);

  const topbar = make('div', 'paint-topbar', root);
  const colorWrap = make('div', 'paint-colors', topbar);
  const colorInput = make('input', 'paint-color-input', colorWrap);
  colorInput.type = 'color';
  const paletteEl = make('div', 'paint-palette', colorWrap);
  const recentEl = make('div', 'paint-palette paint-recent', colorWrap);

  const sliders = make('div', 'paint-sliders', topbar);
  const slider = (labelKey, min, max, value) => {
    const wrap = make('label', 'paint-slider', sliders);
    const label = make('span', 'paint-slider-label', wrap);
    label.dataset.key = labelKey;
    const input = make('input', '', wrap);
    input.type = 'range';
    input.min = min;
    input.max = max;
    input.value = value;
    const out = make('span', 'paint-slider-value', wrap);
    return { wrap, input, out, label };
  };
  const sizeSlider = slider('paint_size', 1, 120, state.size);
  const opacitySlider = slider('paint_opacity', 1, 100, 100);
  const toleranceSlider = slider('paint_tolerance', 0, 100, 12);
  const sampleAllWrap = make('label', 'paint-check', sliders);
  const sampleAllInput = make('input', '', sampleAllWrap);
  sampleAllInput.type = 'checkbox';
  const sampleAllLabel = make('span', '', sampleAllWrap);
  const fillShapesWrap = make('label', 'paint-check', sliders);
  const fillShapesInput = make('input', '', fillShapesWrap);
  fillShapesInput.type = 'checkbox';
  const fillShapesLabel = make('span', '', fillShapesWrap);

  const main = make('div', 'paint-main', root);
  const toolbar = make('div', 'paint-toolbar', main);
  const toolButtons = {};
  TOOLS.forEach((tool) => {
    const btn = make('button', 'paint-tool', toolbar);
    btn.type = 'button';
    btn.textContent = tool.icon;
    btn.dataset.tool = tool.id;
    btn.addEventListener('click', () => setTool(tool.id));
    toolButtons[tool.id] = btn;
  });
  make('div', 'paint-toolbar-sep', toolbar);
  const undoBtn = make('button', 'paint-tool', toolbar);
  undoBtn.type = 'button';
  undoBtn.textContent = '↶';
  const redoBtn = make('button', 'paint-tool', toolbar);
  redoBtn.type = 'button';
  redoBtn.textContent = '↷';

  const stage = make('div', 'paint-stage', main);
  const traceImg = make('img', 'paint-trace', stage);
  traceImg.alt = '';
  traceImg.hidden = true;
  const layerHost = make('div', 'paint-layer-host', stage);
  const bufferCanvas = makeCanvas(); // off-screen: the stroke being drawn
  const bufferCtx = bufferCanvas.getContext('2d');
  const selectionOverlay = makeCanvas();
  selectionOverlay.className = 'paint-selection';
  stage.appendChild(selectionOverlay);
  const refThumb = make('img', 'paint-ref', stage);
  refThumb.alt = '';
  refThumb.hidden = true;
  const cursor = make('div', 'paint-cursor', stage);
  const inputLayer = make('div', 'paint-input', stage); // receives the pointer events

  const side = make('div', 'paint-side', main);
  const layersTitle = make('p', 'paint-side-title', side);
  const layerList = make('ul', 'paint-layer-list', side);
  const layerButtons = make('div', 'paint-side-buttons', side);
  const layerBtn = (icon, fn) => {
    const b = make('button', 'paint-mini', layerButtons);
    b.type = 'button';
    b.textContent = icon;
    b.addEventListener('click', fn);
    return b;
  };
  const addLayerBtn = layerBtn('+', () => addLayer());
  const dupLayerBtn = layerBtn('⧉', () => duplicateLayer());
  const delLayerBtn = layerBtn('🗑', () => deleteLayer());
  const upLayerBtn = layerBtn('▲', () => moveLayer(1));
  const downLayerBtn = layerBtn('▼', () => moveLayer(-1));
  const layerOpacity = slider('paint_layer_opacity', 0, 100, 100);
  side.appendChild(layerOpacity.wrap);

  const selTitle = make('p', 'paint-side-title', side);
  const selButtons = make('div', 'paint-side-buttons paint-sel-buttons', side);
  const selBtn = (fn) => {
    const b = make('button', 'paint-mini paint-wide', selButtons);
    b.type = 'button';
    b.addEventListener('click', fn);
    return b;
  };
  const selAllBtn = selBtn(() => selectAll());
  const selNoneBtn = selBtn(() => deselect());
  const selInvertBtn = selBtn(() => invertSelection());
  const selClearBtn = selBtn(() => clearSelectionArea());
  const selFillBtn = selBtn(() => fillSelectionArea());
  const clearAllBtn = selBtn(() => clearLayer());

  /* selection mask: opaque where selected */
  const selectionCanvas = makeCanvas();
  const selectionCtx = selectionCanvas.getContext('2d');
  const scratch = makeCanvas();
  const scratchCtx = scratch.getContext('2d');
  const baseCanvas = makeCanvas();
  const baseCtx = baseCanvas.getContext('2d');

  /* ---------- Labels (translated) ---------- */

  function applyLabels() {
    const tip = (node, key, shortcut) => { node.dataset.tip = shortcut ? `${t(key)} (${shortcut})` : t(key); node.setAttribute('aria-label', t(key)); };
    TOOLS.forEach((tool) => tip(toolButtons[tool.id], `paint_tool_${tool.id}`, tool.key.toUpperCase()));
    tip(undoBtn, 'paint_undo', 'Ctrl+Z');
    tip(redoBtn, 'paint_redo', 'Ctrl+Y');
    colorInput.title = t('paint_color');
    tip(addLayerBtn, 'paint_layer_add', 'Ctrl+Shift+N');
    tip(dupLayerBtn, 'paint_layer_duplicate');
    tip(delLayerBtn, 'paint_layer_delete');
    tip(upLayerBtn, 'paint_layer_up');
    tip(downLayerBtn, 'paint_layer_down');
    [sizeSlider, opacitySlider, toleranceSlider, layerOpacity].forEach((s) => { s.label.textContent = t(s.label.dataset.key); });
    sizeSlider.wrap.dataset.tip = t('paint_size_tip');
    opacitySlider.wrap.dataset.tip = t('paint_opacity_tip');
    sampleAllLabel.textContent = t('paint_sample_all');
    fillShapesLabel.textContent = t('paint_fill_shapes');
    layersTitle.textContent = t('paint_layers');
    selTitle.textContent = t('paint_selection');
    selAllBtn.textContent = t('paint_select_all');
    selAllBtn.dataset.tip = 'Ctrl+A';
    selNoneBtn.textContent = t('paint_deselect');
    selNoneBtn.dataset.tip = 'Ctrl+D';
    selInvertBtn.textContent = t('paint_invert');
    selInvertBtn.dataset.tip = 'Ctrl+Shift+I';
    selClearBtn.textContent = t('paint_clear_selection');
    selClearBtn.dataset.tip = t('paint_key_delete');
    selFillBtn.textContent = t('paint_fill_selection');
    clearAllBtn.textContent = t('paint_clear_layer');
    renderLayerList();
  }

  /* ---------- Colors ---------- */

  function renderPalette() {
    paletteEl.innerHTML = '';
    PALETTE.forEach((c) => {
      const b = make('button', 'paint-swatch', paletteEl);
      b.type = 'button';
      b.style.background = c;
      b.dataset.color = c;
      b.addEventListener('click', () => setColor(c));
    });
    recentEl.innerHTML = '';
    state.recent.forEach((c) => {
      const b = make('button', 'paint-swatch', recentEl);
      b.type = 'button';
      b.style.background = c;
      b.dataset.color = c;
      b.addEventListener('click', () => setColor(c));
    });
    root.querySelectorAll('.paint-swatch').forEach((b) => b.classList.toggle('selected', b.dataset.color === state.color));
  }

  function setColor(color, remember = true) {
    const c = color.toLowerCase();
    if (c !== state.color) state.previousColor = state.color;
    state.color = c;
    colorInput.value = c;
    if (remember && !PALETTE.includes(c)) {
      state.recent = [c, ...state.recent.filter((x) => x !== c)].slice(0, 8);
    }
    if (state.tool === 'eraser' || state.tool === 'picker') setTool('brush');
    renderPalette();
  }

  colorInput.addEventListener('input', () => setColor(colorInput.value, false));
  colorInput.addEventListener('change', () => setColor(colorInput.value, true));

  /* ---------- Tool options ---------- */

  function syncSliders() {
    sizeSlider.input.value = state.size;
    sizeSlider.out.textContent = `${state.size}px`;
    opacitySlider.input.value = Math.round(state.opacity * 100);
    opacitySlider.out.textContent = `${Math.round(state.opacity * 100)}%`;
    toleranceSlider.input.value = state.tolerance;
    toleranceSlider.out.textContent = String(state.tolerance);
    const fillTool = state.tool === 'bucket' || state.tool === 'wand';
    toleranceSlider.wrap.hidden = !fillTool;
    sampleAllWrap.hidden = !fillTool;
    sizeSlider.wrap.hidden = fillTool || state.tool === 'picker';
    fillShapesWrap.hidden = !['rect', 'ellipse'].includes(state.tool);
    updateCursorSize();
  }

  sizeSlider.input.addEventListener('input', () => { state.size = Number(sizeSlider.input.value); syncSliders(); });
  opacitySlider.input.addEventListener('input', () => { state.opacity = Number(opacitySlider.input.value) / 100; syncSliders(); });
  toleranceSlider.input.addEventListener('input', () => { state.tolerance = Number(toleranceSlider.input.value); syncSliders(); });
  sampleAllInput.addEventListener('change', () => { state.sampleAll = sampleAllInput.checked; });
  fillShapesInput.addEventListener('change', () => { state.fillShapes = fillShapesInput.checked; });

  function setTool(id) {
    state.tool = id;
    Object.entries(toolButtons).forEach(([key, b]) => b.classList.toggle('selected', key === id));
    stage.dataset.tool = id;
    syncSliders();
  }

  /* ---------- Layers ---------- */

  function currentLayer() {
    return state.layers[state.current];
  }

  function createLayer(name) {
    const canvas = makeCanvas();
    canvas.className = 'paint-layer';
    return { id: Math.random().toString(36).slice(2), name, canvas, ctx: canvas.getContext('2d'), visible: true, opacity: 1 };
  }

  function mountLayers() {
    layerHost.innerHTML = '';
    state.layers.forEach((layer) => {
      layer.canvas.style.opacity = layer.opacity;
      layer.canvas.hidden = !layer.visible;
      layerHost.appendChild(layer.canvas);
    });
    renderLayerList();
  }

  function renderLayerList() {
    layerList.innerHTML = '';
    state.layers.slice().reverse().forEach((layer) => {
      const index = state.layers.indexOf(layer);
      const li = make('li', 'paint-layer-item', layerList);
      li.classList.toggle('selected', index === state.current);
      const eye = make('button', 'paint-eye', li);
      eye.type = 'button';
      eye.textContent = layer.visible ? '👁' : '—';
      eye.setAttribute('aria-label', t('paint_layer_visibility'));
      eye.addEventListener('click', (e) => {
        e.stopPropagation();
        layer.visible = !layer.visible;
        mountLayers();
        changed();
      });
      const thumb = make('canvas', 'paint-layer-thumb', li);
      thumb.width = 48;
      thumb.height = 36;
      thumb.getContext('2d').drawImage(layer.canvas, 0, 0, 48, 36);
      const name = make('span', 'paint-layer-name', li);
      name.textContent = layer.name;
      li.addEventListener('click', () => {
        state.current = index;
        mountLayers();
        syncLayerControls();
      });
    });
    syncLayerControls();
  }

  function refreshThumbs() {
    const thumbs = layerList.querySelectorAll('.paint-layer-thumb');
    state.layers.slice().reverse().forEach((layer, i) => {
      const th = thumbs[i];
      if (!th) return;
      const c = th.getContext('2d');
      c.clearRect(0, 0, th.width, th.height);
      c.drawImage(layer.canvas, 0, 0, th.width, th.height);
    });
  }

  function syncLayerControls() {
    const layer = currentLayer();
    if (!layer) return;
    layerOpacity.input.value = Math.round(layer.opacity * 100);
    layerOpacity.out.textContent = `${Math.round(layer.opacity * 100)}%`;
    addLayerBtn.disabled = state.layers.length >= MAX_LAYERS;
    dupLayerBtn.disabled = state.layers.length >= MAX_LAYERS;
    delLayerBtn.disabled = state.layers.length <= 1;
    upLayerBtn.disabled = state.current >= state.layers.length - 1;
    downLayerBtn.disabled = state.current <= 0;
  }

  layerOpacity.input.addEventListener('input', () => {
    const layer = currentLayer();
    layer.opacity = Number(layerOpacity.input.value) / 100;
    layer.canvas.style.opacity = layer.opacity;
    layerOpacity.out.textContent = `${layerOpacity.input.value}%`;
    changed();
  });

  function addLayer(fromLayer = null) {
    if (state.layers.length >= MAX_LAYERS) return;
    const layer = createLayer(`${t('paint_layer')} ${state.nextLayerNumber++}`);
    if (fromLayer) {
      layer.ctx.drawImage(fromLayer.canvas, 0, 0);
      layer.opacity = fromLayer.opacity;
      layer.name = `${fromLayer.name} (2)`;
    }
    state.layers.splice(state.current + 1, 0, layer);
    state.current += 1;
    mountLayers();
    changed();
  }

  function duplicateLayer() {
    addLayer(currentLayer());
  }

  function deleteLayer() {
    if (state.layers.length <= 1) return;
    state.layers.splice(state.current, 1);
    state.current = Math.max(0, state.current - 1);
    mountLayers();
    changed();
  }

  function moveLayer(direction) {
    const to = state.current + direction;
    if (to < 0 || to >= state.layers.length) return;
    const [layer] = state.layers.splice(state.current, 1);
    state.layers.splice(to, 0, layer);
    state.current = to;
    mountLayers();
    changed();
  }

  /* ---------- History (per layer pixels) ---------- */

  function snapshot(layer) {
    return { layerId: layer.id, before: layer.ctx.getImageData(0, 0, W, H), after: null };
  }

  function pushHistory(entry) {
    state.undo.push(entry);
    if (state.undo.length > MAX_HISTORY) state.undo.shift();
    state.redo = [];
  }

  function findLayer(id) {
    return state.layers.find((l) => l.id === id);
  }

  function undo() {
    while (state.undo.length) {
      const entry = state.undo.pop();
      const layer = findLayer(entry.layerId);
      if (!layer) continue; // the layer was deleted since
      entry.after = layer.ctx.getImageData(0, 0, W, H);
      layer.ctx.putImageData(entry.before, 0, 0);
      state.redo.push(entry);
      changed();
      return;
    }
  }

  function redo() {
    while (state.redo.length) {
      const entry = state.redo.pop();
      const layer = findLayer(entry.layerId);
      if (!layer) continue;
      layer.ctx.putImageData(entry.after, 0, 0);
      state.undo.push(entry);
      changed();
      return;
    }
  }

  undoBtn.addEventListener('click', () => { if (state.enabled) undo(); });
  redoBtn.addEventListener('click', () => { if (state.enabled) redo(); });

  /* ---------- Selection ---------- */

  function renderSelectionOverlay() {
    const ctx = selectionOverlay.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    if (!state.hasSelection) return;
    ctx.drawImage(selectionCanvas, 0, 0);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = 'rgba(40, 140, 255, 0.28)';
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }

  function setSelectionFromMask(mask, mode) {
    const img = mode === 'replace' || !state.hasSelection
      ? selectionCtx.createImageData(W, H)
      : selectionCtx.getImageData(0, 0, W, H);
    for (let i = 0; i < mask.length; i++) {
      if (!mask[i]) continue;
      const a = i * 4 + 3;
      if (mode === 'subtract') img.data[a] = 0;
      else { img.data[a - 3] = 255; img.data[a - 2] = 255; img.data[a - 1] = 255; img.data[a] = 255; }
    }
    selectionCtx.putImageData(img, 0, 0);
    state.hasSelection = true;
    renderSelectionOverlay();
  }

  function selectAll() {
    selectionCtx.fillStyle = '#fff';
    selectionCtx.fillRect(0, 0, W, H);
    state.hasSelection = true;
    renderSelectionOverlay();
  }

  function deselect() {
    selectionCtx.clearRect(0, 0, W, H);
    state.hasSelection = false;
    renderSelectionOverlay();
  }

  function invertSelection() {
    if (!state.hasSelection) {
      selectAll();
      return;
    }
    scratchCtx.clearRect(0, 0, W, H);
    scratchCtx.fillStyle = '#fff';
    scratchCtx.fillRect(0, 0, W, H);
    scratchCtx.globalCompositeOperation = 'destination-out';
    scratchCtx.drawImage(selectionCanvas, 0, 0);
    scratchCtx.globalCompositeOperation = 'source-over';
    selectionCtx.clearRect(0, 0, W, H);
    selectionCtx.drawImage(scratch, 0, 0);
    renderSelectionOverlay();
  }

  /* Draws `source` onto the current layer through the selection (if any). */
  function composite(ctx, source, alpha, erase) {
    let src = source;
    if (state.hasSelection) {
      scratchCtx.clearRect(0, 0, W, H);
      scratchCtx.drawImage(source, 0, 0);
      scratchCtx.globalCompositeOperation = 'destination-in';
      scratchCtx.drawImage(selectionCanvas, 0, 0);
      scratchCtx.globalCompositeOperation = 'source-over';
      src = scratch;
    }
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = erase ? 'destination-out' : 'source-over';
    ctx.drawImage(src, 0, 0);
    ctx.restore();
  }

  function clearSelectionArea() {
    const layer = currentLayer();
    pushHistory(snapshot(layer));
    if (state.hasSelection) {
      layer.ctx.save();
      layer.ctx.globalCompositeOperation = 'destination-out';
      layer.ctx.drawImage(selectionCanvas, 0, 0);
      layer.ctx.restore();
    } else {
      layer.ctx.clearRect(0, 0, W, H);
    }
    changed();
  }

  function fillSelectionArea() {
    const layer = currentLayer();
    pushHistory(snapshot(layer));
    bufferCtx.clearRect(0, 0, W, H);
    bufferCtx.fillStyle = state.color;
    bufferCtx.fillRect(0, 0, W, H);
    composite(layer.ctx, bufferCanvas, state.opacity, false);
    bufferCtx.clearRect(0, 0, W, H);
    changed();
  }

  function clearLayer() {
    const layer = currentLayer();
    pushHistory(snapshot(layer));
    layer.ctx.clearRect(0, 0, W, H);
    changed();
  }

  /* ---------- Flood fill (bucket / magic wand) ---------- */

  function samplePixels() {
    if (!state.sampleAll) return currentLayer().ctx.getImageData(0, 0, W, H);
    scratchCtx.clearRect(0, 0, W, H);
    state.layers.forEach((l) => {
      if (!l.visible) return;
      scratchCtx.globalAlpha = l.opacity;
      scratchCtx.drawImage(l.canvas, 0, 0);
    });
    scratchCtx.globalAlpha = 1;
    return scratchCtx.getImageData(0, 0, W, H);
  }

  function floodMask(image, x0, y0, tolerance) {
    const data = image.data;
    const mask = new Uint8Array(W * H);
    const start = (y0 * W + x0) * 4;
    const [r0, g0, b0, a0] = [data[start], data[start + 1], data[start + 2], data[start + 3]];
    const tol = Math.round(tolerance * 2.55);
    const matches = (i) => {
      const p = i * 4;
      // fully transparent pixels all count as "empty", whatever their RGB
      if (a0 === 0 && data[p + 3] === 0) return true;
      return Math.abs(data[p] - r0) <= tol && Math.abs(data[p + 1] - g0) <= tol
        && Math.abs(data[p + 2] - b0) <= tol && Math.abs(data[p + 3] - a0) <= tol;
    };
    const stack = [[x0, y0]];
    while (stack.length) {
      const [x, y] = stack.pop();
      let lx = x;
      while (lx > 0 && !mask[y * W + lx - 1] && matches(y * W + lx - 1)) lx--;
      let rx = x;
      while (rx < W - 1 && !mask[y * W + rx + 1] && matches(y * W + rx + 1)) rx++;
      for (let xi = lx; xi <= rx; xi++) {
        const i = y * W + xi;
        if (mask[i] || !matches(i)) continue;
        mask[i] = 1;
        if (y > 0 && !mask[i - W] && matches(i - W)) stack.push([xi, y - 1]);
        if (y < H - 1 && !mask[i + W] && matches(i + W)) stack.push([xi, y + 1]);
      }
    }
    return mask;
  }

  /* Grow the fill by 1px so it tucks under anti-aliased line edges. */
  function dilate(mask) {
    const out = mask.slice();
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (mask[i]) continue;
        if ((x > 0 && mask[i - 1]) || (x < W - 1 && mask[i + 1]) || (y > 0 && mask[i - W]) || (y < H - 1 && mask[i + W])) out[i] = 1;
      }
    }
    return out;
  }

  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function bucketFill(p) {
    const x = Math.floor(p.x);
    const y = Math.floor(p.y);
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const layer = currentLayer();
    const mask = dilate(floodMask(samplePixels(), x, y, state.tolerance));
    const [r, g, b] = hexToRgb(state.color);
    const img = bufferCtx.createImageData(W, H);
    for (let i = 0; i < mask.length; i++) {
      if (!mask[i]) continue;
      const q = i * 4;
      img.data[q] = r; img.data[q + 1] = g; img.data[q + 2] = b; img.data[q + 3] = 255;
    }
    pushHistory(snapshot(layer));
    bufferCtx.putImageData(img, 0, 0);
    composite(layer.ctx, bufferCanvas, state.opacity, false);
    bufferCtx.clearRect(0, 0, W, H);
    changed();
  }

  function magicWand(p, e) {
    const x = Math.floor(p.x);
    const y = Math.floor(p.y);
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const mode = e.shiftKey ? 'add' : (e.altKey ? 'subtract' : 'replace');
    setSelectionFromMask(floodMask(samplePixels(), x, y, state.tolerance), mode);
  }

  function pickColor(p) {
    const x = Math.max(0, Math.min(W - 1, Math.floor(p.x)));
    const y = Math.max(0, Math.min(H - 1, Math.floor(p.y)));
    scratchCtx.clearRect(0, 0, W, H);
    scratchCtx.fillStyle = '#fff';
    scratchCtx.fillRect(0, 0, W, H);
    state.layers.forEach((l) => {
      if (!l.visible) return;
      scratchCtx.globalAlpha = l.opacity;
      scratchCtx.drawImage(l.canvas, 0, 0);
    });
    scratchCtx.globalAlpha = 1;
    const d = scratchCtx.getImageData(x, y, 1, 1).data;
    setColor(`#${[d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join('')}`);
  }

  /* ---------- Strokes and shapes ---------- */

  function toCanvasPoint(e) {
    const rect = inputLayer.getBoundingClientRect();
    const pen = e.pointerType === 'pen';
    return {
      x: ((e.clientX - rect.left) / rect.width) * W,
      y: ((e.clientY - rect.top) / rect.height) * H,
      p: pen ? Math.max(0.05, e.pressure || 0.5) : 1,
    };
  }

  function widthAt(point) {
    return Math.max(1, state.size * (0.15 + 0.85 * point.p));
  }

  function drawBrushSegment(stroke) {
    const pts = stroke.points;
    const n = pts.length;
    bufferCtx.strokeStyle = '#000';
    bufferCtx.fillStyle = '#000';
    if (!stroke.erase) {
      bufferCtx.strokeStyle = stroke.color;
      bufferCtx.fillStyle = stroke.color;
    }
    bufferCtx.lineCap = 'round';
    bufferCtx.lineJoin = 'round';
    if (n === 1) {
      bufferCtx.beginPath();
      bufferCtx.arc(pts[0].x, pts[0].y, widthAt(pts[0]) / 2, 0, Math.PI * 2);
      bufferCtx.fill();
      return;
    }
    // smooth: quadratic curve from the previous midpoint to the new midpoint
    const a = pts[n - 3] || pts[n - 2];
    const b = pts[n - 2];
    const c = pts[n - 1];
    const m1 = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const m2 = { x: (b.x + c.x) / 2, y: (b.y + c.y) / 2 };
    bufferCtx.lineWidth = widthAt(b);
    bufferCtx.beginPath();
    bufferCtx.moveTo(n === 2 ? a.x : m1.x, n === 2 ? a.y : m1.y);
    bufferCtx.quadraticCurveTo(b.x, b.y, m2.x, m2.y);
    bufferCtx.stroke();
  }

  function drawShape(stroke, end, constrain) {
    bufferCtx.clearRect(0, 0, W, H);
    const s = stroke.points[0];
    let dx = end.x - s.x;
    let dy = end.y - s.y;
    if (constrain) {
      if (stroke.tool === 'line') {
        const angle = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
        const len = Math.hypot(dx, dy);
        dx = Math.cos(angle) * len;
        dy = Math.sin(angle) * len;
      } else {
        const m = Math.max(Math.abs(dx), Math.abs(dy));
        dx = Math.sign(dx || 1) * m;
        dy = Math.sign(dy || 1) * m;
      }
    }
    bufferCtx.strokeStyle = stroke.color;
    bufferCtx.fillStyle = stroke.color;
    bufferCtx.lineWidth = state.size;
    bufferCtx.lineCap = 'round';
    bufferCtx.lineJoin = 'round';
    bufferCtx.beginPath();
    if (stroke.tool === 'line') {
      bufferCtx.moveTo(s.x, s.y);
      bufferCtx.lineTo(s.x + dx, s.y + dy);
      bufferCtx.stroke();
      return;
    }
    if (stroke.tool === 'rect') bufferCtx.rect(s.x, s.y, dx, dy);
    else bufferCtx.ellipse(s.x + dx / 2, s.y + dy / 2, Math.abs(dx / 2), Math.abs(dy / 2), 0, 0, Math.PI * 2);
    if (state.fillShapes) bufferCtx.fill();
    else bufferCtx.stroke();
  }

  /* The layer being painted = its pixels before the stroke + the stroke
     buffer, composited with the opacity / selection / eraser mode. */
  function renderStroke() {
    state.renderQueued = false;
    const stroke = state.stroke;
    if (!stroke) return;
    const layer = currentLayer();
    layer.ctx.clearRect(0, 0, W, H);
    layer.ctx.drawImage(baseCanvas, 0, 0);
    composite(layer.ctx, bufferCanvas, state.opacity, stroke.erase);
    queueLiveFrame();
  }

  function queueRender() {
    if (state.renderQueued) return;
    state.renderQueued = true;
    requestAnimationFrame(renderStroke);
  }

  function beginStroke(e, tool) {
    const layer = currentLayer();
    if (!layer.visible) return;
    const p = toCanvasPoint(e);
    const penEraser = e.pointerType === 'pen' && (e.buttons & 32) === 32;
    const erase = tool === 'eraser' || penEraser;
    pushHistory(snapshot(layer));
    baseCtx.clearRect(0, 0, W, H);
    baseCtx.drawImage(layer.canvas, 0, 0);
    bufferCtx.clearRect(0, 0, W, H);
    state.stroke = { tool: penEraser ? 'eraser' : tool, erase, color: state.color, points: [p] };
    if (tool === 'brush' || tool === 'eraser' || penEraser) drawBrushSegment(state.stroke);
    queueRender();
  }

  function moveStroke(e) {
    const stroke = state.stroke;
    const events = typeof e.getCoalescedEvents === 'function' && e.getCoalescedEvents().length ? e.getCoalescedEvents() : [e];
    if (stroke.tool === 'brush' || stroke.tool === 'eraser') {
      events.forEach((ev) => {
        const p = toCanvasPoint(ev);
        const last = stroke.points[stroke.points.length - 1];
        if (Math.hypot(p.x - last.x, p.y - last.y) < 0.8) return;
        stroke.points.push(p);
        drawBrushSegment(stroke);
      });
    } else {
      drawShape(stroke, toCanvasPoint(e), e.shiftKey);
    }
    queueRender();
  }

  function endStroke() {
    const stroke = state.stroke;
    if (!stroke) return;
    const pts = stroke.points;
    if ((stroke.tool === 'brush' || stroke.tool === 'eraser') && pts.length >= 2) {
      // close the gap between the last smoothed midpoint and the pen-up point
      const a = pts[pts.length - 2];
      const b = pts[pts.length - 1];
      bufferCtx.lineWidth = widthAt(b);
      bufferCtx.beginPath();
      bufferCtx.moveTo((a.x + b.x) / 2, (a.y + b.y) / 2);
      bufferCtx.lineTo(b.x, b.y);
      bufferCtx.stroke();
    }
    renderStroke();
    state.stroke = null;
    bufferCtx.clearRect(0, 0, W, H);
    changed();
  }

  /* ---------- Pointer input ---------- */

  let activePointer = null;

  inputLayer.addEventListener('pointerdown', (e) => {
    if (!state.enabled || activePointer !== null) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();
    const p = toCanvasPoint(e);
    const tool = e.altKey && ['brush', 'bucket', 'line', 'rect', 'ellipse'].includes(state.tool) ? 'picker' : state.tool;
    if (tool === 'picker') { pickColor(p); return; }
    if (tool === 'bucket') { bucketFill(p); return; }
    if (tool === 'wand') { magicWand(p, e); return; }
    activePointer = e.pointerId;
    try { inputLayer.setPointerCapture(e.pointerId); } catch (err) { /* optional */ }
    beginStroke(e, tool);
  });

  inputLayer.addEventListener('pointermove', (e) => {
    moveCursor(e);
    if (activePointer !== e.pointerId || !state.stroke) return;
    e.preventDefault();
    moveStroke(e);
  });

  const finish = (e) => {
    if (activePointer !== e.pointerId) return;
    activePointer = null;
    endStroke();
  };
  inputLayer.addEventListener('pointerup', finish);
  inputLayer.addEventListener('pointercancel', finish);
  inputLayer.addEventListener('pointerleave', () => { cursor.hidden = true; });
  inputLayer.addEventListener('pointerenter', () => { cursor.hidden = !state.enabled; });

  /* Brush-size circle that follows the pointer. */
  function moveCursor(e) {
    const rect = inputLayer.getBoundingClientRect();
    cursor.style.left = `${e.clientX - rect.left}px`;
    cursor.style.top = `${e.clientY - rect.top}px`;
  }

  function updateCursorSize() {
    const rect = inputLayer.getBoundingClientRect();
    const scale = rect.width ? rect.width / W : 1;
    const showCircle = ['brush', 'eraser', 'line', 'rect', 'ellipse'].includes(state.tool);
    const px = Math.max(4, state.size * scale);
    cursor.style.width = `${px}px`;
    cursor.style.height = `${px}px`;
    cursor.classList.toggle('dot', !showCircle);
  }

  stage.addEventListener('wheel', (e) => {
    if (!state.enabled) return;
    e.preventDefault();
    const up = e.deltaY < 0;
    if (e.shiftKey) {
      state.opacity = Math.min(1, Math.max(0.01, state.opacity + (up ? 0.05 : -0.05)));
    } else {
      const step = state.size < 10 ? 1 : Math.round(state.size * 0.12);
      state.size = Math.min(120, Math.max(1, state.size + (up ? step : -step)));
    }
    syncSliders();
  }, { passive: false });

  /* ---------- Keyboard shortcuts ---------- */

  function isTyping(target) {
    return target && (target.tagName === 'INPUT' && target.type !== 'range' && target.type !== 'checkbox' && target.type !== 'color' || target.tagName === 'TEXTAREA' || target.isContentEditable);
  }

  document.addEventListener('keydown', (e) => {
    if (!state.enabled || !root.isConnected || root.offsetParent === null || isTyping(e.target)) return;
    const key = e.key.toLowerCase();
    const ctrl = e.ctrlKey || e.metaKey;
    let handled = true;
    if (ctrl && key === 'z' && !e.shiftKey) undo();
    else if (ctrl && (key === 'y' || (key === 'z' && e.shiftKey))) redo();
    else if (ctrl && key === 'a') selectAll();
    else if (ctrl && key === 'd') deselect();
    else if (ctrl && e.shiftKey && key === 'i') invertSelection();
    else if (ctrl && e.shiftKey && key === 'n') addLayer();
    else if (ctrl) handled = false;
    else if (key === 'delete' || key === 'backspace') clearSelectionArea();
    else if (key === '[') { state.size = Math.max(1, state.size - (state.size < 10 ? 1 : 3)); syncSliders(); }
    else if (key === ']') { state.size = Math.min(120, state.size + (state.size < 10 ? 1 : 3)); syncSliders(); }
    else if (key === 'x') setColor(state.previousColor);
    else {
      const tool = TOOLS.find((tl) => tl.key === key);
      if (tool) setTool(tool.id);
      else handled = false;
    }
    if (handled) e.preventDefault();
  });

  /* ---------- Change notifications / live preview ---------- */

  function changed() {
    renderSelectionOverlay();
    refreshThumbs();
    queueLiveFrame();
    if (state.onChange) state.onChange();
  }

  function queueLiveFrame() {
    if (!state.onLiveFrame || state.liveTimer) return;
    state.liveTimer = setTimeout(() => {
      state.liveTimer = null;
      if (state.onLiveFrame) state.onLiveFrame(exportDataURL('image/webp', 0.5, 0.7));
    }, 350);
  }

  /* ---------- Public API ---------- */

  function exportDataURL(type = 'image/png', scale = 1, quality) {
    const out = document.createElement('canvas');
    out.width = Math.round(W * scale);
    out.height = Math.round(H * scale);
    const ctx = out.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, out.width, out.height);
    state.layers.forEach((l) => {
      if (!l.visible) return;
      ctx.globalAlpha = l.opacity;
      ctx.drawImage(l.canvas, 0, 0, out.width, out.height);
    });
    ctx.globalAlpha = 1;
    return out.toDataURL(type, quality);
  }

  function reset() {
    clearTimeout(state.liveTimer);
    state.liveTimer = null;
    state.layers = [];
    state.nextLayerNumber = 1;
    state.layers.push(createLayer(`${t('paint_layer')} ${state.nextLayerNumber++}`));
    state.current = 0;
    state.undo = [];
    state.redo = [];
    state.stroke = null;
    activePointer = null;
    bufferCtx.clearRect(0, 0, W, H);
    deselect();
    mountLayers();
    setReference(null);
    setTool('brush');
    renderPalette();
    syncSliders();
  }

  function setEnabled(enabled) {
    state.enabled = enabled;
    root.classList.toggle('readonly', !enabled);
    cursor.hidden = true;
    setTimeout(updateCursorSize, 0);
  }

  function setReference(url) {
    traceImg.hidden = true;
    refThumb.hidden = true;
    traceImg.src = url || '';
    refThumb.src = url || '';
  }

  /* Viewer side of the live preview: show the drawer's latest frame. */
  function showFrame(url) {
    const img = new Image();
    img.onload = () => {
      const layer = state.layers[0];
      layer.ctx.clearRect(0, 0, W, H);
      layer.ctx.drawImage(img, 0, 0, W, H);
    };
    img.src = url;
  }

  window.addEventListener('resize', updateCursorSize);
  applyLabels();
  reset();

  return {
    reset,
    setEnabled,
    setReference,
    showReference: (show) => { refThumb.hidden = !show || !refThumb.getAttribute('src'); },
    showTrace: (show) => { traceImg.hidden = !show || !traceImg.getAttribute('src'); },
    exportDataURL,
    showFrame,
    applyLabels,
    set onLiveFrame(fn) { state.onLiveFrame = fn; },
    set onChange(fn) { state.onChange = fn; },
    get isEnabled() { return state.enabled; },
  };
}
