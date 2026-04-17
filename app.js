(function() {
  'use strict';

  // ===== Elements =====
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const viewport = document.getElementById('viewport');
  const wrapper = document.getElementById('canvasWrapper');
  const emptyState = document.getElementById('emptyState');
  const upload = document.getElementById('upload');
  const exportBtn = document.getElementById('export');
  const copyImageBtn = document.getElementById('copyImage');
  const pasteImageBtn = document.getElementById('pasteImage');
  const blankCanvasBtn = document.getElementById('blankCanvas');
  const fitScreenBtn = document.getElementById('fitScreen');
  const undoBtn = document.getElementById('undo');
  const redoBtn = document.getElementById('redo');
  const clearBtn = document.getElementById('clear');
  const deleteBtn = document.getElementById('delete');
  const saveProjectBtn = document.getElementById('saveProject');
  const openProjectInput = document.getElementById('openProject');
  const statusSize = document.getElementById('statusSize');
  const statusScale = document.getElementById('statusScale');
  const statusPos = document.getElementById('statusPos');

  // Global props
  const strokeWidthInput = document.getElementById('strokeWidth');
  const strokeValue = document.getElementById('strokeValue');
  const globalColorPicker = document.getElementById('globalColor');

  // Selection props
  const selGroup = document.getElementById('selGroup');
  const selType = document.getElementById('selType');
  const selColorGroup = document.getElementById('selColorGroup');
  const selColorPicker = document.getElementById('selColor');
  const selWidthGroup = document.getElementById('selWidthGroup');
  const selWidthInput = document.getElementById('selWidth');
  const selWidthValue = document.getElementById('selWidthValue');
  const selTextGroup = document.getElementById('selTextGroup');
  const selTextInput = document.getElementById('selText');
  const selFillGroup = document.getElementById('selFillGroup');
  const selFillInput = document.getElementById('selFill');
  const zoomGroup = document.getElementById('zoomGroup');
  const zoomInput = document.getElementById('zoomInput');
  const zoomValue = document.getElementById('zoomValue');
  const noSelGroup = document.getElementById('noSelGroup');
  const selDashTypeGroup = document.getElementById('selDashTypeGroup');
  const selDashTypePicker = document.getElementById('selDashType');
  const selDashTightInput = document.getElementById('selDashTight');
  const selDashTightValue = document.getElementById('selDashTightValue');

  // Polygon toolbar
  const polygonToolbar = document.getElementById('polygonToolbar');
  const polySidesInput = document.getElementById('polySides');
  const polyRegularInput = document.getElementById('polyRegular');

  // Polygon selection props
  const selPolygonGroup = document.getElementById('selPolygonGroup');
  const selPolySides = document.getElementById('selPolySides');
  const selPolyRegular = document.getElementById('selPolyRegular');
  const selVertexAngleGroup = document.getElementById('selVertexAngleGroup');
  const selVertexAngle = document.getElementById('selVertexAngle');

  // Angle selection props
  const selAngleGroup = document.getElementById('selAngleGroup');
  const selAngle = document.getElementById('selAngle');
  const selAngleFontGroup = document.getElementById('selAngleFontGroup');
  const selAngleFont = document.getElementById('selAngleFont');
  const selAngleFontValue = document.getElementById('selAngleFontValue');

  // Mosaic selection props
  const selMosaicBlurGroup = document.getElementById('selMosaicBlurGroup');
  const selMosaicBlur = document.getElementById('selMosaicBlur');
  const selMosaicBlurValue = document.getElementById('selMosaicBlurValue');

  // Text overlay
  const textOverlay = document.getElementById('textOverlay');
  const textEditor = document.getElementById('textEditor');

  // Save project overlay
  const saveProjectOverlay = document.getElementById('saveProjectOverlay');
  const saveProjectName = document.getElementById('saveProjectName');
  const saveProjectActions = document.getElementById('saveProjectActions');
  const saveProjectCancel = document.getElementById('saveProjectCancel');
  const saveProjectOverwrite = document.getElementById('saveProjectOverwrite');
  const saveProjectConfirm = document.getElementById('saveProjectConfirm');

  // Picker preview
  const pickerPreview = document.getElementById('pickerPreview');
  const pickerCanvas = document.getElementById('pickerCanvas');
  const pickerCtx = pickerCanvas.getContext('2d');
  let pickerTempCanvas = null;

  // Layer dropdown
  const layerDropdown = document.getElementById('layerDropdown');
  const layerToggle = document.getElementById('layerToggle');
  const layerPanel = document.getElementById('layerPanel');
  const layerList = document.getElementById('layerList');

  // ===== State =====
  const state = {
    bgImage: null,
    bgWidth: 0,
    bgHeight: 0,
    mosaicCaches: {},
    isBlankCanvas: false,
    currentProjectName: null,
    shapes: [],
    undoStack: [],
    redoStack: [],
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    tool: 'select',
    color: '#ff6b35',
    width: 3,
    defaultZoom: 2,
    recentColor: null,
    selectedId: null,
    selectedIds: [],
    isDrawing: false,
    isPanning: false,
    isDragging: false,
    isResizing: false,
    isRotating: false,
    isMarquee: false,
    marqueeStart: null,
    marqueeEnd: null,
    resizeHandle: null,
    dragStart: null,      // mouse pos at drag start (screen)
    dragOrigin: null,     // copy of shape at drag start
    groupDragOrigins: [], // array of {id, origin} for multi-drag
    lastMouse: {x:0, y:0},
    tempShape: null,
    spaceDown: false,
    draggedHandle: null,
  };

  const COLORS = ['#ff0000', '#ff8800', '#ffcc00', '#00cc44', '#00cccc', '#aa00ff', '#212529', '#ffffff'];
  const TYPE_NAMES = {select:'选择', text:'文字', rect:'矩形', circle:'圆形', polygon:'多边形', angle:'角度', line:'直线', arrow:'箭头', pen:'手写', mosaic:'马赛克', magnifier:'放大镜', stripMagnifier:'长条放大镜', image:'图片'};

  function ensureLinePoints(s) {
    if (s.points) return s.points;
    if (s.x1 != null) {
      s.points = [{x: s.x1, y: s.y1}, {x: s.x2, y: s.y2}];
    }
    return s.points || [];
  }

  function generateRegularPolygonPoints(cx, cy, w, h, sides) {
    const rx = Math.abs(w) / 2;
    const ry = Math.abs(h) / 2;
    const pts = [];
    for (let i = 0; i < sides; i++) {
      const theta = -Math.PI / 2 + (Math.PI * 2 * i) / sides;
      pts.push({
        x: cx + rx * Math.cos(theta),
        y: cy + ry * Math.sin(theta)
      });
    }
    return pts;
  }

  function polygonVertexAngle(points, idx) {
    const prev = points[(idx - 1 + points.length) % points.length];
    const curr = points[idx];
    const next = points[(idx + 1) % points.length];
    const a = Math.atan2(prev.y - curr.y, prev.x - curr.x);
    const b = Math.atan2(next.y - curr.y, next.x - curr.x);
    let angle = b - a;
    if (angle < 0) angle += Math.PI * 2;
    return angle; // interior angle in radians
  }

  function angleSpread(s) {
    let d = s.a2 - s.a1;
    while (d < 0) d += Math.PI * 2;
    while (d >= Math.PI * 2) d -= Math.PI * 2;
    return d > Math.PI ? d - Math.PI * 2 : d;
  }
  function setAngleSpread(s, deg) {
    const spread = deg * Math.PI / 180;
    const bisector = Math.atan2(Math.sin(s.a1) + Math.sin(s.a2), Math.cos(s.a1) + Math.cos(s.a2));
    s.a1 = bisector - spread / 2;
    s.a2 = bisector + spread / 2;
  }

  function setPolygonVertexAngle(points, idx, degrees) {
    const prev = points[(idx - 1 + points.length) % points.length];
    const curr = points[idx];
    const next = points[(idx + 1) % points.length];
    const d1 = Math.hypot(curr.x - prev.x, curr.y - prev.y);
    const d2 = Math.hypot(curr.x - next.x, curr.y - next.y);
    const c = Math.hypot(next.x - prev.x, next.y - prev.y);
    if (c < 0.001) return;
    const A = degrees * Math.PI / 180;
    const ratio = d2 / (d1 || 1);
    const denom = 1 + ratio * ratio - 2 * ratio * Math.cos(A);
    if (denom <= 0) return;
    const newD1 = c / Math.sqrt(denom);
    const newD2 = ratio * newD1;
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const dist = Math.hypot(dx, dy);
    const ux = dx / dist;
    const uy = dy / dist;
    const a = (newD1 * newD1 - newD2 * newD2 + dist * dist) / (2 * dist);
    const hSq = newD1 * newD1 - a * a;
    if (hSq < 0) return;
    const h = Math.sqrt(hSq);
    const bx = prev.x + a * ux;
    const by = prev.y + a * uy;
    const px = -uy * h;
    const py = ux * h;
    const cand1 = {x: bx + px, y: by + py};
    const cand2 = {x: bx - px, y: by - py};
    const d1c = Math.hypot(cand1.x - curr.x, cand1.y - curr.y);
    const d2c = Math.hypot(cand2.x - curr.x, cand2.y - curr.y);
    points[idx] = d1c < d2c ? cand1 : cand2;
  }

  // ===== Utils =====
  function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  const imageCache = new Map();
  function getCachedImage(src) {
    if (imageCache.has(src)) return imageCache.get(src);
    const img = new Image();
    img.src = src;
    imageCache.set(src, img);
    return img;
  }

  function getRightmostX() {
    let maxX = state.bgImage ? state.bgWidth : 0;
    state.shapes.forEach(s => { if (s.type === 'image') maxX = Math.max(maxX, s.x + s.w); });
    return maxX;
  }

  function screenToWorld(sx, sy) {
    return {
      x: (sx - state.offsetX) / state.scale,
      y: (sy - state.offsetY) / state.scale
    };
  }

  function worldToScreen(wx, wy) {
    return {
      x: wx * state.scale + state.offsetX,
      y: wy * state.scale + state.offsetY
    };
  }

  function getMousePos(e) {
    const rect = viewport.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  function deepCloneShapes() {
    return JSON.parse(JSON.stringify(state.shapes));
  }

  function shapeCenter(s, c = ctx) {
    if (s.type === 'rect' || s.type === 'mosaic' || s.type === 'circle' || s.type === 'image') {
      return {x: s.x + s.w/2, y: s.y + s.h/2};
    } else if (s.type === 'polygon') {
      if (s.regular) {
        return {x: s.x + s.w/2, y: s.y + s.h/2};
      }
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      s.points.forEach(p => {
        minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
      });
      return {x: (minX + maxX)/2, y: (minY + maxY)/2};
    } else if (s.type === 'magnifier') {
      return {x: s.x, y: s.y};
    } else if (s.type === 'stripMagnifier') {
      return {x: s.x + s.w/2, y: s.y + s.h/2};
    } else if (s.type === 'angle') {
      return {x: s.x, y: s.y};
    } else if (s.type === 'line' || s.type === 'arrow') {
      const pts = ensureLinePoints(s);
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      pts.forEach(p => {
        minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
      });
      return {x: (minX + maxX)/2, y: (minY + maxY)/2};
    } else if (s.type === 'text') {
      const fontSize = s.fontSize != null ? s.fontSize : (s.width * 2 + 12);
      c.font = `${fontSize}px sans-serif`;
      const w = c.measureText(s.text).width;
      const h = fontSize * 1.2;
      return {x: s.x + w/2, y: s.y + h/2};
    } else if (s.type === 'pen') {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      s.points.forEach(p => {
        minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
      });
      return {x: (minX + maxX)/2, y: (minY + maxY)/2};
    }
    return {x:0, y:0};
  }

  function toLocal(s, wx, wy) {
    const c = shapeCenter(s);
    const dx = wx - c.x;
    const dy = wy - c.y;
    const a = -(s.angle || 0);
    return {
      x: dx * Math.cos(a) - dy * Math.sin(a),
      y: dx * Math.sin(a) + dy * Math.cos(a)
    };
  }

  function toWorld(s, lx, ly) {
    const c = shapeCenter(s);
    const a = s.angle || 0;
    return {
      x: c.x + lx * Math.cos(a) - ly * Math.sin(a),
      y: c.y + lx * Math.sin(a) + ly * Math.cos(a)
    };
  }

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
      const hex = Math.max(0, Math.min(255, x)).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

  function getDashArray(s) {
    if (!s.dashType || s.dashType === 'solid') return [];
    const tight = s.dashTight == null ? 5 : s.dashTight;
    const w = s.width || 1;
    if (s.dashType === 'dashed') return [w + tight * 2, w + tight * 2];
    if (s.dashType === 'dotted') return [w, w + tight * 2];
    return [];
  }

  function recordState() {
    state.undoStack.push({
      shapes: deepCloneShapes(),
      selectedId: state.selectedId,
      selectedIds: state.selectedIds.slice()
    });
    if (state.undoStack.length > 100) state.undoStack.shift();
    state.redoStack = [];
    updateUndoRedoUI();
  }

  function undo() {
    if (!state.undoStack.length) return;
    state.redoStack.push({ shapes: deepCloneShapes(), selectedId: state.selectedId, selectedIds: state.selectedIds.slice() });
    const snap = state.undoStack.pop();
    state.shapes = snap.shapes;
    state.selectedId = snap.selectedId;
    state.selectedIds = snap.selectedIds ? snap.selectedIds.slice() : (snap.selectedId ? [snap.selectedId] : []);
    updateUndoRedoUI();
    updateSelectionUI();
    renderLayerList();
    clearMosaicCaches();
    draw();
  }

  function redo() {
    if (!state.redoStack.length) return;
    state.undoStack.push({ shapes: deepCloneShapes(), selectedId: state.selectedId, selectedIds: state.selectedIds.slice() });
    const snap = state.redoStack.pop();
    state.shapes = snap.shapes;
    state.selectedId = snap.selectedId;
    state.selectedIds = snap.selectedIds ? snap.selectedIds.slice() : (snap.selectedId ? [snap.selectedId] : []);
    updateUndoRedoUI();
    updateSelectionUI();
    renderLayerList();
    clearMosaicCaches();
    draw();
  }

  function updateUndoRedoUI() {
    undoBtn.disabled = !state.undoStack.length;
    redoBtn.disabled = !state.redoStack.length;
    undoBtn.style.opacity = undoBtn.disabled ? '0.4' : '1';
    redoBtn.style.opacity = redoBtn.disabled ? '0.4' : '1';
  }

  // ===== Canvas sizing =====
  function resizeCanvas() {
    canvas.width = viewport.clientWidth;
    canvas.height = viewport.clientHeight;
    draw();
  }
  window.addEventListener('resize', resizeCanvas);

  // ===== Mosaic cache =====
  function clearMosaicCaches() {
    state.mosaicCaches = {};
  }

  function getMosaicCache(blur) {
    if (!state.bgImage) return null;
    const key = blur;
    if (state.mosaicCaches[key]) return state.mosaicCaches[key];

    const cell = blur;
    const composite = document.createElement('canvas');
    composite.width = state.bgWidth;
    composite.height = state.bgHeight;
    const cctx = composite.getContext('2d');
    cctx.drawImage(state.bgImage, 0, 0);
    state.shapes.forEach(s => {
      if (s.type !== 'mosaic' && s.type !== 'magnifier' && s.type !== 'stripMagnifier') {
        drawShape(cctx, s, false);
      }
    });

    const temp = document.createElement('canvas');
    temp.width = Math.max(1, Math.floor(state.bgWidth / cell));
    temp.height = Math.max(1, Math.floor(state.bgHeight / cell));
    const tctx = temp.getContext('2d');
    tctx.drawImage(composite, 0, 0, temp.width, temp.height);

    const mc = document.createElement('canvas');
    mc.width = state.bgWidth;
    mc.height = state.bgHeight;
    const mctx = mc.getContext('2d');
    mctx.imageSmoothingEnabled = false;
    mctx.drawImage(temp, 0, 0, mc.width, mc.height);
    state.mosaicCaches[key] = mc;
    return mc;
  }

  // ===== Fit / Zoom =====
  function fitToScreen() {
    if (!state.bgImage) return;
    const padding = 40;
    const vw = viewport.clientWidth - padding * 2;
    const vh = viewport.clientHeight - padding * 2;
    const scale = Math.min(vw / state.bgWidth, vh / state.bgHeight, 1);
    state.scale = scale;
    state.offsetX = (viewport.clientWidth - state.bgWidth * scale) / 2;
    state.offsetY = (viewport.clientHeight - state.bgHeight * scale) / 2;
    draw();
  }

  function zoomAt(sx, sy, factor) {
    const world = screenToWorld(sx, sy);
    const newScale = clamp(state.scale * factor, 0.05, 10);
    state.scale = newScale;
    state.offsetX = sx - world.x * newScale;
    state.offsetY = sy - world.y * newScale;
    draw();
  }

  viewport.addEventListener('wheel', e => {
    e.preventDefault();
    if (!state.bgImage) return;
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    zoomAt(e.offsetX, e.offsetY, factor);
  }, {passive: false});

  // ===== Tools =====
  function setTool(name) {
    state.tool = name;
    document.querySelectorAll('.tool[data-tool]').forEach(t => {
      const match = t.dataset.tool === name || (t.dataset.tool === 'magnifier' && (name === 'magnifier' || name === 'stripMagnifier'));
      t.classList.toggle('active', match);
    });
    if (name !== 'picker') hidePickerPreview();
    updateCursor();
    updateSelectionUI();
    updatePolygonToolbar();
  }

  function updatePolygonToolbar() {
    const s = getSelected();
    const show = state.tool === 'polygon' || (state.selectedIds.length === 1 && s && s.type === 'polygon');
    polygonToolbar.style.display = show ? 'flex' : 'none';
    if (show && s && s.type === 'polygon') {
      polySidesInput.value = s.sides || 5;
      polyRegularInput.checked = !!s.regular;
    }
  }

  const magnifierOverlay = document.getElementById('magnifierOverlay');
  function toggleMagnifierOverlay(show) {
    magnifierOverlay.style.display = show ? 'flex' : 'none';
  }

  document.querySelectorAll('.tool[data-tool]').forEach(btn => {
    if (btn.dataset.tool === 'magnifier') {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = magnifierOverlay.style.display === 'none';
        toggleMagnifierOverlay(isHidden);
      });
    } else {
      btn.addEventListener('click', () => setTool(btn.dataset.tool));
    }
  });

  document.querySelectorAll('.tool-overlay-option[data-subtool]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      setTool(item.dataset.subtool);
      toggleMagnifierOverlay(false);
    });
  });

  magnifierOverlay.addEventListener('click', () => {
    toggleMagnifierOverlay(false);
  });

  undoBtn.addEventListener('click', undo);
  redoBtn.addEventListener('click', redo);
  clearBtn.addEventListener('click', () => {
    if (!state.bgImage || !state.shapes.length) return;
    recordState();
    state.shapes = [];
    state.selectedId = null;
    state.selectedIds = [];
    updateSelectionUI();
    renderLayerList();
    clearMosaicCaches();
    draw();
  });
  deleteBtn.addEventListener('click', deleteSelected);
  fitScreenBtn.addEventListener('click', fitToScreen);

  function deleteSelected() {
    if (!state.selectedIds.length) return;
    recordState();
    state.shapes = state.shapes.filter(s => !state.selectedIds.includes(s.id));
    state.selectedId = null;
    state.selectedIds = [];
    state.draggedHandle = null;
    updateSelectionUI();
    renderLayerList();
    clearMosaicCaches();
    draw();
  }

  // ===== Color pickers =====
  function buildColorPicker(container, activeColor, onChange, recentColor = null) {
    container.innerHTML = '';
    COLORS.forEach(c => {
      const el = document.createElement('div');
      el.className = 'color-option' + (c === activeColor ? ' active' : '');
      el.style.setProperty('--c', c);
      el.addEventListener('click', () => {
        onChange(c);
        buildColorPicker(container, c, onChange, recentColor);
      });
      container.appendChild(el);
    });
    if (recentColor) {
      const el = document.createElement('div');
      el.className = 'color-option recent' + (recentColor === activeColor ? ' active' : '');
      el.style.setProperty('--c', recentColor);
      el.title = '最近取色';
      el.addEventListener('click', () => {
        onChange(recentColor);
        buildColorPicker(container, recentColor, onChange, recentColor);
      });
      container.appendChild(el);
    }
  }

  function buildDashTypePicker(container, activeType, onChange) {
    container.innerHTML = '';
    const types = [
      {name: 'solid', svg: '<svg viewBox="0 0 24 12"><line x1="2" y1="6" x2="22" y2="6" stroke="#333" stroke-width="2" fill="none"/></svg>'},
      {name: 'dashed', svg: '<svg viewBox="0 0 24 12"><line x1="2" y1="6" x2="22" y2="6" stroke="#333" stroke-width="2" stroke-dasharray="6,4" fill="none"/></svg>'},
      {name: 'dotted', svg: '<svg viewBox="0 0 24 12"><line x1="2" y1="6" x2="22" y2="6" stroke="#333" stroke-width="2" stroke-dasharray="2,4" fill="none"/></svg>'}
    ];
    types.forEach(t => {
      const el = document.createElement('div');
      el.className = 'dash-option' + (t.name === activeType ? ' active' : '');
      el.title = t.name === 'solid' ? '实线' : t.name === 'dashed' ? '虚线' : '点线';
      el.innerHTML = t.svg;
      el.addEventListener('click', () => {
        onChange(t.name);
      });
      container.appendChild(el);
    });
  }

  function setGlobalColor(c) {
    state.color = c;
    if (state.selectedIds.length) {
      recordState();
      state.selectedIds.forEach(id => {
        const s = state.shapes.find(x => x.id === id);
        if (s) s.color = c;
      });
      draw();
      updateSelectionUI();
    }
  }

  buildColorPicker(globalColorPicker, state.color, setGlobalColor, state.recentColor);

  // ===== Global width =====
  strokeWidthInput.addEventListener('input', () => {
    state.width = parseInt(strokeWidthInput.value, 10);
    strokeValue.textContent = state.width + 'px';
    if (state.selectedIds.length) {
      state.selectedIds.forEach(id => {
        const s = state.shapes.find(x => x.id === id);
        if (s) s.width = state.width;
      });
      draw();
      updateSelectionUI();
    }
  });

  // ===== Selection properties =====
  selWidthInput.addEventListener('input', () => {
    const v = parseInt(selWidthInput.value, 10);
    selWidthValue.textContent = v + 'px';
    state.selectedIds.forEach(id => {
      const s = state.shapes.find(x => x.id === id);
      if (s) s.width = v;
    });
    draw();
  });
  selWidthInput.addEventListener('change', () => {
    if (state.selectedIds.length) recordState();
  });

  selTextInput.addEventListener('input', () => {
    if (state.selectedIds.length === 1) {
      const s = getSelected();
      if (s && s.type === 'text') {
        s.text = selTextInput.value;
        draw();
      }
    }
  });

  selFillInput.addEventListener('change', () => {
    applyToSelection('fill', selFillInput.checked, ['rect', 'circle', 'polygon']);
  });

  selDashTightInput.addEventListener('input', () => {
    const v = parseInt(selDashTightInput.value, 10);
    selDashTightValue.textContent = v;
    const dashTypes = ['rect', 'circle', 'polygon', 'angle', 'line', 'arrow', 'pen'];
    state.selectedIds.forEach(id => {
      const s = state.shapes.find(x => x.id === id);
      if (s && dashTypes.includes(s.type)) s.dashTight = v;
    });
    draw();
  });
  selDashTightInput.addEventListener('change', () => {
    if (state.selectedIds.length) recordState();
  });

  zoomInput.addEventListener('input', () => {
    const v = parseFloat(zoomInput.value);
    zoomValue.textContent = v + 'x';
    state.selectedIds.forEach(id => {
      const s = state.shapes.find(x => x.id === id);
      if (s && (s.type === 'magnifier' || s.type === 'stripMagnifier')) s.zoom = v;
    });
    if (!state.selectedIds.some(id => {
      const s = state.shapes.find(x => x.id === id);
      return s && (s.type === 'magnifier' || s.type === 'stripMagnifier');
    })) {
      state.defaultZoom = v;
    }
    draw();
  });
  zoomInput.addEventListener('change', () => {
    if (state.selectedIds.some(id => {
      const s = state.shapes.find(x => x.id === id);
      return s && (s.type === 'magnifier' || s.type === 'stripMagnifier');
    })) recordState();
  });

  selMosaicBlur.addEventListener('input', () => {
    const v = parseInt(selMosaicBlur.value, 10);
    selMosaicBlurValue.textContent = v;
    state.selectedIds.forEach(id => {
      const s = state.shapes.find(x => x.id === id);
      if (s && s.type === 'mosaic') s.mosaicBlur = v;
    });
    draw();
  });
  selMosaicBlur.addEventListener('change', () => {
    if (state.selectedIds.some(id => {
      const s = state.shapes.find(x => x.id === id);
      return s && s.type === 'mosaic';
    })) recordState();
  });

  function regeneratePolygonPoints(s) {
    if (s.regular) {
      const cx = s.x + s.w / 2;
      const cy = s.y + s.h / 2;
      s.points = generateRegularPolygonPoints(cx, cy, s.w, s.h, s.sides);
    } else {
      // For irregular, recompute bounding box from current points then regenerate regular shape
      const cen = shapeCenter(s);
      const bbox = shapeLocalBBox(s);
      s.x = cen.x + bbox.x;
      s.y = cen.y + bbox.y;
      s.w = bbox.w;
      s.h = bbox.h;
      const cx = s.x + s.w / 2;
      const cy = s.y + s.h / 2;
      s.points = generateRegularPolygonPoints(cx, cy, s.w, s.h, s.sides);
    }
  }

  // Polygon toolbar events
  function onPolySidesChange(val) {
    const s = getSelected();
    if (!s || s.type !== 'polygon') return;
    recordState();
    s.sides = Math.max(3, Math.min(20, parseInt(val, 10) || 5));
    regeneratePolygonPoints(s);
    draw();
    updateSelectionUI();
  }
  polySidesInput.addEventListener('input', () => onPolySidesChange(polySidesInput.value));
  polySidesInput.addEventListener('change', () => onPolySidesChange(polySidesInput.value));

  polyRegularInput.addEventListener('change', () => {
    const s = getSelected();
    if (!s || s.type !== 'polygon') return;
    recordState();
    s.regular = polyRegularInput.checked;
    if (s.regular) {
      const cen = shapeCenter(s);
      const bbox = shapeLocalBBox(s);
      s.x = cen.x + bbox.x;
      s.y = cen.y + bbox.y;
      s.w = bbox.w;
      s.h = bbox.h;
    }
    regeneratePolygonPoints(s);
    draw();
    updateSelectionUI();
  });

  // Polygon selection props events
  function onSelPolySidesChange(val) {
    const v = Math.max(3, Math.min(20, parseInt(val, 10) || 5));
    const targets = state.selectedIds.map(id => state.shapes.find(x => x.id === id)).filter(s => s && s.type === 'polygon');
    if (!targets.length) return;
    recordState();
    targets.forEach(s => { s.sides = v; regeneratePolygonPoints(s); });
    draw();
    updateSelectionUI();
  }
  selPolySides.addEventListener('input', () => onSelPolySidesChange(selPolySides.value));
  selPolySides.addEventListener('change', () => onSelPolySidesChange(selPolySides.value));

  selPolyRegular.addEventListener('change', () => {
    const targets = state.selectedIds.map(id => state.shapes.find(x => x.id === id)).filter(s => s && s.type === 'polygon');
    if (!targets.length) return;
    recordState();
    targets.forEach(s => {
      s.regular = selPolyRegular.checked;
      if (s.regular) {
        const cen = shapeCenter(s);
        const bbox = shapeLocalBBox(s);
        s.x = cen.x + bbox.x;
        s.y = cen.y + bbox.y;
        s.w = bbox.w;
        s.h = bbox.h;
      }
      regeneratePolygonPoints(s);
    });
    draw();
    updateSelectionUI();
  });
  selVertexAngle.addEventListener('change', () => {
    const s = getSelected();
    if (!s || s.type !== 'polygon' || s.regular) return;
    recordState();
    const ptMatch = state.draggedHandle ? state.draggedHandle.match(/^pt-(\d+)$/) : null;
    const vIdx = ptMatch ? parseInt(ptMatch[1], 10) : 0;
    const deg = parseFloat(selVertexAngle.value) || 0;
    setPolygonVertexAngle(s.points, vIdx, Math.max(1, Math.min(359, deg)));
    draw();
    updateSelectionUI();
  });

  function onSelAngleChange(val) {
    const targets = state.selectedIds.map(id => state.shapes.find(x => x.id === id)).filter(s => s && s.type === 'angle');
    if (!targets.length) return;
    recordState();
    const deg = Math.max(1, Math.min(359, parseFloat(val) || 90));
    targets.forEach(s => setAngleSpread(s, deg));
    draw();
    updateSelectionUI();
  }
  selAngle.addEventListener('input', () => onSelAngleChange(selAngle.value));
  selAngle.addEventListener('change', () => onSelAngleChange(selAngle.value));

  selAngleFont.addEventListener('input', () => {
    const v = parseInt(selAngleFont.value, 10) || 20;
    selAngleFontValue.textContent = v + 'px';
    state.selectedIds.forEach(id => {
      const s = state.shapes.find(x => x.id === id);
      if (s && (s.type === 'angle' || s.type === 'text')) s.fontSize = v;
    });
    draw();
  });
  selAngleFont.addEventListener('change', () => {
    if (state.selectedIds.some(id => {
      const s = state.shapes.find(x => x.id === id);
      return s && (s.type === 'angle' || s.type === 'text');
    })) recordState();
  });

  function getSelected() {
    return state.shapes.find(s => s.id === state.selectedId) || null;
  }

  function getCommonProp(ids, key, defaultVal) {
    let val;
    let hasVal = false;
    for (const id of ids) {
      const s = state.shapes.find(x => x.id === id);
      if (!s) continue;
      if (!(key in s)) return undefined;
      if (!hasVal) { val = s[key]; hasVal = true; }
      else if (val !== s[key]) return undefined;
    }
    return hasVal ? val : defaultVal;
  }

  function allHaveProp(ids, key) {
    for (const id of ids) {
      const s = state.shapes.find(x => x.id === id);
      if (!s || !(key in s)) return false;
    }
    return ids.length > 0;
  }

  function applyToSelection(prop, value, filterTypes = null) {
    if (!state.selectedIds.length) return;
    recordState();
    state.selectedIds.forEach(id => {
      const s = state.shapes.find(x => x.id === id);
      if (!s) return;
      if (filterTypes && !filterTypes.includes(s.type)) return;
      s[prop] = value;
    });
    draw();
    updateSelectionUI();
  }

  function updateSelectionUI() {
    const multi = state.selectedIds.length > 1;
    const s = getSelected();
    if (!s) {
      selGroup.style.display = 'none';
      selColorGroup.style.display = 'none';
      selWidthGroup.style.display = 'none';
      selTextGroup.style.display = 'none';
      selFillGroup.style.display = 'none';
      selDashTypeGroup.style.display = 'none';
      selDashTightGroup.style.display = 'none';
      selPolygonGroup.style.display = 'none';
      selVertexAngleGroup.style.display = 'none';
      selAngleGroup.style.display = 'none';
      selAngleFontGroup.style.display = 'none';
      if (state.tool === 'magnifier' || state.tool === 'stripMagnifier') {
        noSelGroup.style.display = 'none';
        zoomGroup.style.display = 'block';
        zoomInput.value = state.defaultZoom;
        zoomValue.textContent = state.defaultZoom + 'x';
      } else {
        zoomGroup.style.display = 'none';
        noSelGroup.style.display = 'block';
      }
      return;
    }
    noSelGroup.style.display = 'none';
    selGroup.style.display = 'block';

    if (multi) {
      selType.textContent = `已选中 ${state.selectedIds.length} 个元素`;
    } else {
      const sIdx = state.shapes.findIndex(x => x.id === s.id);
      let selCount = 0;
      for (let j = 0; j <= sIdx; j++) {
        if (state.shapes[j].type === s.type) selCount++;
      }
      selType.textContent = (TYPE_NAMES[s.type] || s.type) + (selCount > 1 ? ' ' + selCount : '');
    }

    // Color
    const commonColor = getCommonProp(state.selectedIds, 'color');
    selColorGroup.style.display = 'block';
    buildColorPicker(selColorPicker, commonColor !== undefined ? commonColor : s.color, c => {
      applyToSelection('color', c);
    }, state.recentColor);

    // Width
    const commonWidth = getCommonProp(state.selectedIds, 'width');
    selWidthGroup.style.display = commonWidth !== undefined ? 'block' : 'none';
    if (commonWidth !== undefined) {
      selWidthInput.value = commonWidth;
      selWidthValue.textContent = commonWidth + 'px';
    }

    // Text
    if (!multi && s.type === 'text') {
      selTextGroup.style.display = 'block';
      selTextInput.value = s.text;
      selAngleFontGroup.style.display = 'block';
      selAngleFont.value = s.fontSize != null ? s.fontSize : (s.width * 2 + 12);
      selAngleFontValue.textContent = selAngleFont.value + 'px';
    } else {
      selTextGroup.style.display = 'none';
    }

    // Fill
    const fillTypes = ['rect', 'circle', 'polygon'];
    const hasFill = state.selectedIds.some(id => {
      const sh = state.shapes.find(x => x.id === id);
      return sh && fillTypes.includes(sh.type);
    });
    if (hasFill) {
      selFillGroup.style.display = 'block';
      const commonFill = getCommonProp(state.selectedIds, 'fill');
      selFillInput.checked = commonFill !== undefined ? !!commonFill : false;
    } else {
      selFillGroup.style.display = 'none';
    }

    // Dash
    const dashTypes = ['rect', 'circle', 'polygon', 'angle', 'line', 'arrow', 'pen'];
    const hasDash = state.selectedIds.some(id => {
      const sh = state.shapes.find(x => x.id === id);
      return sh && dashTypes.includes(sh.type);
    });
    if (hasDash) {
      selDashTypeGroup.style.display = 'block';
      selDashTightGroup.style.display = 'block';
      const commonDash = getCommonProp(state.selectedIds, 'dashType', 'solid');
      buildDashTypePicker(selDashTypePicker, commonDash || 'solid', type => {
        applyToSelection('dashType', type, dashTypes);
      });
      const commonTight = getCommonProp(state.selectedIds, 'dashTight', 5);
      selDashTightInput.value = commonTight != null ? commonTight : 5;
      selDashTightValue.textContent = selDashTightInput.value;
    } else {
      selDashTypeGroup.style.display = 'none';
      selDashTightGroup.style.display = 'none';
    }

    // Polygon specific
    const polySelected = state.selectedIds.filter(id => {
      const sh = state.shapes.find(x => x.id === id);
      return sh && sh.type === 'polygon';
    });
    if (polySelected.length === 1 && !multi) {
      selPolygonGroup.style.display = 'block';
      selPolySides.value = s.sides || 5;
      selPolyRegular.checked = !!s.regular;
      if (!s.regular) {
        selVertexAngleGroup.style.display = 'block';
        const ptMatch = state.draggedHandle ? state.draggedHandle.match(/^pt-(\d+)$/) : null;
        const vIdx = ptMatch ? parseInt(ptMatch[1], 10) : 0;
        const angleDeg = Math.round(polygonVertexAngle(s.points, vIdx) * 180 / Math.PI);
        selVertexAngle.value = angleDeg;
      } else {
        selVertexAngleGroup.style.display = 'none';
      }
      selAngleGroup.style.display = 'none';
      selAngleFontGroup.style.display = 'none';
    } else if (polySelected.length > 0) {
      // Multi selection contains polygons: hide vertex angle, but keep sides/regular if all polygons selected and common values exist
      const commonSides = getCommonProp(polySelected, 'sides');
      const commonRegular = getCommonProp(polySelected, 'regular');
      selPolygonGroup.style.display = (commonSides !== undefined || commonRegular !== undefined) ? 'block' : 'none';
      if (commonSides !== undefined) selPolySides.value = commonSides;
      if (commonRegular !== undefined) selPolyRegular.checked = commonRegular;
      selVertexAngleGroup.style.display = 'none';
      selAngleGroup.style.display = 'none';
      selAngleFontGroup.style.display = 'none';
    } else if (!multi && s.type === 'angle') {
      selPolygonGroup.style.display = 'none';
      selVertexAngleGroup.style.display = 'none';
      selAngleGroup.style.display = 'block';
      selAngleFontGroup.style.display = 'block';
      const deg = Math.max(1, Math.min(359, Math.round(Math.abs(angleSpread(s)) * 180 / Math.PI)));
      selAngle.value = deg;
      selAngleFont.value = s.fontSize || 20;
      selAngleFontValue.textContent = (s.fontSize || 20) + 'px';
    } else if (!multi && s.type === 'text') {
      // handled above
    } else {
      selPolygonGroup.style.display = 'none';
      selVertexAngleGroup.style.display = 'none';
      selAngleGroup.style.display = 'none';
      selAngleFontGroup.style.display = 'none';
    }

    // Zoom (magnifier)
    const magSelected = state.selectedIds.filter(id => {
      const sh = state.shapes.find(x => x.id === id);
      return sh && (sh.type === 'magnifier' || sh.type === 'stripMagnifier');
    });
    if (magSelected.length) {
      zoomGroup.style.display = 'block';
      const commonZoom = getCommonProp(magSelected, 'zoom');
      zoomInput.value = commonZoom !== undefined ? commonZoom : state.defaultZoom;
      zoomValue.textContent = zoomInput.value + 'x';
    } else {
      if (state.tool === 'magnifier' || state.tool === 'stripMagnifier') {
        zoomGroup.style.display = 'block';
        zoomInput.value = state.defaultZoom;
        zoomValue.textContent = state.defaultZoom + 'x';
      } else {
        zoomGroup.style.display = 'none';
      }
    }

    // Mosaic blur
    const mosaicSelected = state.selectedIds.filter(id => {
      const sh = state.shapes.find(x => x.id === id);
      return sh && sh.type === 'mosaic';
    });
    if (mosaicSelected.length) {
      selMosaicBlurGroup.style.display = 'block';
      const commonBlur = getCommonProp(mosaicSelected, 'mosaicBlur');
      selMosaicBlur.value = commonBlur !== undefined ? commonBlur : 12;
      selMosaicBlurValue.textContent = selMosaicBlur.value;
    } else {
      selMosaicBlurGroup.style.display = 'none';
    }

    if (layerPanel.style.display !== 'none') renderLayerList();
    updatePolygonToolbar();
  }

  // ===== Layer list =====
  const LAYER_ICONS = {
    select: '<svg viewBox="0 0 24 24"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/></svg>',
    text: '<svg viewBox="0 0 24 24"><path d="M5 4v3h5.5v12h3V7H19V4z"/></svg>',
    rect: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    circle: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    polygon: '<svg viewBox="0 0 24 24"><polygon points="12,3 21,9 18,20 6,20 3,9" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    angle: '<svg viewBox="0 0 24 24"><line x1="5" y1="19" x2="19" y2="19" stroke="currentColor" stroke-width="2"/><line x1="5" y1="19" x2="13" y2="7" stroke="currentColor" stroke-width="2"/><path d="M9 19 A 4 4 0 0 1 11 15" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
    line: '<svg viewBox="0 0 24 24"><line x1="5" y1="19" x2="19" y2="5" stroke="currentColor" stroke-width="2"/></svg>',
    arrow: '<svg viewBox="0 0 24 24"><path d="M5 19l9-9 4 4V5H10l4 4-9 9" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    pen: '<svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 000-1.41l-2.34-2.34a.996.996 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/></svg>',
    mosaic: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" fill="currentColor"/><rect x="13" y="4" width="7" height="7" fill="currentColor"/><rect x="4" y="13" width="7" height="7" fill="currentColor"/><rect x="13" y="13" width="7" height="7" fill="currentColor"/></svg>',
    magnifier: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="M20 20l-4.35-4.35" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
    stripMagnifier: '<svg viewBox="0 0 24 24"><rect x="3" y="8" width="18" height="8" rx="1" fill="none" stroke="currentColor" stroke-width="2"/><line x1="7" y1="12" x2="17" y2="12" stroke="currentColor" stroke-width="2"/></svg>',
    image: '<svg viewBox="0 0 24 24"><rect x="4" y="6" width="16" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="8" cy="10" r="1.5" fill="currentColor"/><path d="M4 16l4-4 3 3 5-5 4 4v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z" fill="currentColor"/></svg>'
  };

  function renderLayerList() {
    layerList.innerHTML = '';
    if (!state.shapes.length) {
      layerList.innerHTML = '<div class="layer-empty">暂无标记</div>';
      return;
    }
    // Reverse display: list top = shapes end (topmost)
    for (let li = 0; li < state.shapes.length; li++) {
      const ai = state.shapes.length - 1 - li;
      const s = state.shapes[ai];
      let typeCount = 0;
      for (let j = 0; j <= ai; j++) {
        if (state.shapes[j].type === s.type) typeCount++;
      }
      const displayName = (TYPE_NAMES[s.type] || s.type) + (typeCount > 1 ? ' ' + typeCount : '');
      const item = document.createElement('div');
      item.className = 'layer-item' + (state.selectedIds.includes(s.id) ? ' active' : '');
      item.draggable = true;
      item.dataset.arrayIndex = ai;
      item.innerHTML = `
        <div class="layer-icon">${LAYER_ICONS[s.type] || ''}</div>
        <div class="layer-name">${displayName}</div>
      `;
      item.addEventListener('click', () => {
        state.selectedId = s.id;
        state.selectedIds = [s.id];
        updateSelectionUI();
        draw();
      });
      item.addEventListener('dragstart', e => {
        item.classList.add('dragging');
        e.dataTransfer.setData('text/plain', String(ai));
        e.dataTransfer.effectAllowed = 'move';
      });
      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        document.querySelectorAll('.layer-item').forEach(el => el.classList.remove('drag-over'));
        renderLayerList();
      });
      item.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const target = e.currentTarget;
        document.querySelectorAll('.layer-item').forEach(el => el.classList.remove('drag-over'));
        target.classList.add('drag-over');
      });
      item.addEventListener('dragleave', e => {
        e.currentTarget.classList.remove('drag-over');
      });
      layerList.appendChild(item);
    }
  }

  // Recalculate drop cleanly
  layerList.addEventListener('dragover', e => {
    e.preventDefault();
    const afterElement = getDragAfterElement(layerList, e.clientY);
    const draggingEl = document.querySelector('.layer-item.dragging');
    if (!draggingEl) return;
    if (afterElement == null) {
      layerList.appendChild(draggingEl);
    } else {
      layerList.insertBefore(draggingEl, afterElement);
    }
  });

  layerList.addEventListener('drop', e => {
    e.preventDefault();
    const fromAi = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (isNaN(fromAi)) return;
    // Read current DOM order to determine new array order
    const items = Array.from(layerList.querySelectorAll('.layer-item'));
    const newOrder = items.map(el => parseInt(el.dataset.arrayIndex, 10));
    const currentReverse = state.shapes.map((_, i) => i).reverse();
    if (newOrder.length === currentReverse.length && newOrder.every((v, i) => v === currentReverse[i])) return; // no change
    recordState();
    state.shapes = newOrder.slice().reverse().map(ai => state.shapes[ai]);
    renderLayerList();
    draw();
  });

  function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.layer-item:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  // Toggle layer panel
  layerToggle.addEventListener('click', e => {
    e.stopPropagation();
    const showing = layerPanel.style.display !== 'none';
    layerPanel.style.display = showing ? 'none' : 'block';
    if (!showing) renderLayerList();
  });
  document.addEventListener('click', e => {
    if (!layerDropdown.contains(e.target)) {
      layerPanel.style.display = 'none';
    }
  });

  function initProject(img, shapes = [], color = null, width = null, projectName = null) {
    // Migrate legacy line/arrow data
    shapes.forEach(s => {
      if ((s.type === 'line' || s.type === 'arrow') && !s.points && s.x1 != null) {
        s.points = [{x: s.x1, y: s.y1}, {x: s.x2, y: s.y2}];
      }
    });
    state.bgImage = img;
    state.bgWidth = img.width;
    state.bgHeight = img.height;
    state.isBlankCanvas = false;
    state.currentProjectName = projectName;
    state.shapes = shapes;
    state.undoStack = [];
    state.redoStack = [];
    state.selectedId = null;
    state.selectedIds = [];
    state.tempShape = null;
    if (color != null) state.color = color;
    if (width != null) state.width = width;
    clearMosaicCaches();
    emptyState.classList.add('hidden');
    resizeCanvas();
    fitToScreen();
    updateUndoRedoUI();
    updateSelectionUI();
    renderLayerList();
    buildColorPicker(globalColorPicker, state.color, setGlobalColor, state.recentColor);
    strokeWidthInput.value = state.width;
    strokeValue.textContent = state.width + 'px';
    blankCanvasBtn.style.display = 'none';
  }

  function initBlankCanvas() {
    if (state.bgImage) return;
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    const width = Math.max(800, Math.floor(vw * 0.85));
    const height = Math.max(600, Math.floor(vh * 0.85));
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    const tctx = c.getContext('2d');
    tctx.fillStyle = '#ffffff';
    tctx.fillRect(0, 0, width, height);
    const img = new Image();
    img.onload = () => {
      state.isBlankCanvas = true;
      initProject(img);
      blankCanvasBtn.style.display = 'none';
    };
    img.src = c.toDataURL();
  }

  blankCanvasBtn.addEventListener('click', initBlankCanvas);

  // ===== Image loading =====
  upload.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const img = new Image();
      img.onload = () => initProject(img);
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  });

  function loadImageFromBlob(blob, onLoad) {
    const reader = new FileReader();
    reader.onload = evt => {
      const img = new Image();
      img.onload = () => onLoad(img, evt.target.result);
      img.src = evt.target.result;
    };
    reader.readAsDataURL(blob);
  }

  function addImageShape(img, dataURL) {
    recordState();
    const shape = {
      id: uid(), type: 'image',
      x: getRightmostX() + 20, y: 0,
      w: img.width, h: img.height,
      src: dataURL, angle: 0
    };
    state.shapes.push(shape);
    state.selectedId = shape.id;
    state.selectedIds = [shape.id];
    renderLayerList();
    updateSelectionUI();
    clearMosaicCaches();
    draw();
  }

  async function importFromClipboard() {
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          for (const type of item.types) {
            if (type.startsWith('image/')) {
              const blob = await item.getType(type);
              loadImageFromBlob(blob, (img, dataURL) => {
                if (!state.bgImage) initProject(img);
                else addImageShape(img, dataURL);
              });
              return;
            }
          }
        }
      }
      alert('剪贴板中没有找到图片');
    } catch (err) {
      alert('无法读取剪贴板：' + err.message);
    }
  }

  pasteImageBtn.addEventListener('click', importFromClipboard);

  window.addEventListener('paste', e => {
    const items = e.clipboardData && e.clipboardData.items ? Array.from(e.clipboardData.items) : [];
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const blob = item.getAsFile();
        if (!blob) continue;
        loadImageFromBlob(blob, (img, dataURL) => {
          if (!state.bgImage) initProject(img);
          else addImageShape(img, dataURL);
        });
        return;
      }
    }
  });

  function getContentBounds() {
    let minX = 0, minY = 0, maxX = state.bgImage ? state.bgWidth : 0, maxY = state.bgImage ? state.bgHeight : 0;
    state.shapes.forEach(s => {
      if (s.type === 'image') {
        minX = Math.min(minX, s.x);
        minY = Math.min(minY, s.y);
        maxX = Math.max(maxX, s.x + s.w);
        maxY = Math.max(maxY, s.y + s.h);
      } else {
        const c = shapeCenter(s);
        const b = shapeLocalBBox(s);
        minX = Math.min(minX, c.x + b.x);
        minY = Math.min(minY, c.y + b.y);
        maxX = Math.max(maxX, c.x + b.x + b.w);
        maxY = Math.max(maxY, c.y + b.y + b.h);
      }
    });
    return {minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY};
  }

  // ===== Export =====
  exportBtn.addEventListener('click', () => {
    if (!state.bgImage) return alert('请先打开图片');
    const bounds = getContentBounds();
    const oc = document.createElement('canvas');
    oc.width = Math.max(1, Math.ceil(bounds.w));
    oc.height = Math.max(1, Math.ceil(bounds.h));
    const octx = oc.getContext('2d');
    octx.drawImage(state.bgImage, -bounds.minX, -bounds.minY);
    const compositeCanvas = buildCompositeCanvas();
    state.shapes.forEach(s => {
      octx.save();
      octx.translate(-bounds.minX, -bounds.minY);
      drawShape(octx, s, false, compositeCanvas);
      octx.restore();
    });
    const link = document.createElement('a');
    link.download = 'annotated_' + Date.now() + '.png';
    link.href = oc.toDataURL('image/png');
    link.click();
  });

  copyImageBtn.addEventListener('click', async () => {
    if (!state.bgImage) return alert('请先打开图片');
    const bounds = getContentBounds();
    const oc = document.createElement('canvas');
    oc.width = Math.max(1, Math.ceil(bounds.w));
    oc.height = Math.max(1, Math.ceil(bounds.h));
    const octx = oc.getContext('2d');
    octx.drawImage(state.bgImage, -bounds.minX, -bounds.minY);
    const compositeCanvas = buildCompositeCanvas();
    state.shapes.forEach(s => {
      octx.save();
      octx.translate(-bounds.minX, -bounds.minY);
      drawShape(octx, s, false, compositeCanvas);
      octx.restore();
    });
    try {
      const blob = await new Promise((resolve, reject) => {
        oc.toBlob(b => b ? resolve(b) : reject(new Error('导出失败')), 'image/png');
      });
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      alert('已复制到剪贴板');
    } catch (err) {
      alert('复制失败：' + err.message);
    }
  });

  // ===== Save / Load Project =====
  function doDownloadProject(filename) {
    const project = {
      version: 1,
      image: state.bgImage.src,
      shapes: deepCloneShapes(),
      color: state.color,
      width: state.width
    };
    const blob = new Blob([JSON.stringify(project)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function openSaveProjectOverlay() {
    if (!state.bgImage) return alert('请先打开图片或创建空白画布');
    const hasOpened = !!state.currentProjectName;
    saveProjectName.value = state.currentProjectName || ('project_' + Date.now() + '.stukproj');
    if (hasOpened) {
      saveProjectOverwrite.style.display = 'inline-flex';
      saveProjectConfirm.textContent = '另存为';
    } else {
      saveProjectOverwrite.style.display = 'none';
      saveProjectConfirm.textContent = '保存';
    }
    saveProjectOverlay.style.display = 'flex';
    setTimeout(() => saveProjectName.focus(), 0);
  }

  function closeSaveProjectOverlay() {
    saveProjectOverlay.style.display = 'none';
  }

  saveProjectBtn.addEventListener('click', openSaveProjectOverlay);

  saveProjectCancel.addEventListener('click', (e) => {
    e.stopPropagation();
    closeSaveProjectOverlay();
  });

  saveProjectOverwrite.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!state.currentProjectName) return;
    doDownloadProject(state.currentProjectName);
    closeSaveProjectOverlay();
  });

  saveProjectConfirm.addEventListener('click', (e) => {
    e.stopPropagation();
    let name = saveProjectName.value.trim();
    if (!name) return alert('请输入文件名');
    if (!name.endsWith('.stukproj')) name += '.stukproj';
    doDownloadProject(name);
    closeSaveProjectOverlay();
  });

  saveProjectOverlay.addEventListener('click', () => {
    closeSaveProjectOverlay();
  });

  saveProjectOverlay.querySelector('.tool-overlay-panel').addEventListener('click', (e) => {
    e.stopPropagation();
  });

  saveProjectName.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveProjectConfirm.click();
    } else if (e.key === 'Escape') {
      closeSaveProjectOverlay();
    }
  });

  openProjectInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const project = JSON.parse(evt.target.result);
        if (!project.image || !Array.isArray(project.shapes)) throw new Error('项目文件格式不正确');
        const img = new Image();
        img.onload = () => {
          initProject(img, project.shapes, project.color, project.width, file.name);
          const imageSrcs = project.shapes
            .filter(s => s.type === 'image' && s.src)
            .map(s => s.src);
          const uniqueSrcs = [...new Set(imageSrcs)];
          if (uniqueSrcs.length > 0) {
            Promise.all(uniqueSrcs.map(src => new Promise((resolve) => {
              const i = new Image();
              i.onload = resolve;
              i.onerror = resolve;
              i.src = src;
            }))).then(() => {
              clearMosaicCaches();
              draw();
            });
          } else {
            clearMosaicCaches();
            draw();
          }
        };
        img.src = project.image;
      } catch (err) {
        alert('无法打开项目文件：' + err.message);
      }
    };
    reader.readAsText(file);
  });

  // ===== Drawing =====
  function buildCompositeCanvas() {
    const hasMagnifier = state.shapes.some(s => s.type === 'magnifier' || s.type === 'stripMagnifier');
    if (!hasMagnifier) return null;
    const cc = document.createElement('canvas');
    cc.width = state.bgWidth || 1;
    cc.height = state.bgHeight || 1;
    const cctx = cc.getContext('2d');
    if (state.bgImage) cctx.drawImage(state.bgImage, 0, 0);
    state.shapes.forEach(s => {
      if (s.type !== 'magnifier' && s.type !== 'stripMagnifier') {
        drawShape(cctx, s, false);
      }
    });
    return cc;
  }

  function draw() {
    // Resize canvas to viewport
    if (canvas.width !== viewport.clientWidth || canvas.height !== viewport.clientHeight) {
      canvas.width = viewport.clientWidth;
      canvas.height = viewport.clientHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Grid background for outside image
    ctx.save();
    ctx.fillStyle = '#e5e5e5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Set world transform
    ctx.setTransform(state.scale, 0, 0, state.scale, state.offsetX, state.offsetY);

    if (state.bgImage) {
      ctx.drawImage(state.bgImage, 0, 0);
    }

    const compositeCanvas = buildCompositeCanvas();
    const isSelected = id => state.selectedIds.includes(id);
    state.shapes.forEach(s => drawShape(ctx, s, isSelected(s.id), compositeCanvas));
    if (state.tempShape) drawShape(ctx, state.tempShape, false, compositeCanvas);

    // Draw selection UI (only for single selection)
    if (state.selectedIds.length === 1 && !state.tempShape) {
      const s = state.shapes.find(x => x.id === state.selectedId);
      if (s) drawSelectionUI(ctx, s);
    }

    // Draw multi-selection group bounding box
    if (state.selectedIds.length > 1) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      state.selectedIds.forEach(id => {
        const s = state.shapes.find(x => x.id === id);
        if (!s) return;
        const c = shapeCenter(s, ctx);
        const b = shapeLocalBBox(s, ctx);
        const cos = Math.cos(s.angle || 0);
        const sin = Math.sin(s.angle || 0);
        const corners = [
          {x: b.x, y: b.y},
          {x: b.x + b.w, y: b.y},
          {x: b.x + b.w, y: b.y + b.h},
          {x: b.x, y: b.y + b.h}
        ];
        corners.forEach(p => {
          const rx = p.x * cos - p.y * sin;
          const ry = p.x * sin + p.y * cos;
          const wx = c.x + rx;
          const wy = c.y + ry;
          minX = Math.min(minX, wx);
          minY = Math.min(minY, wy);
          maxX = Math.max(maxX, wx);
          maxY = Math.max(maxY, wy);
        });
      });
      if (isFinite(minX)) {
        const pad = 6 / state.scale;
        ctx.save();
        ctx.strokeStyle = '#339af0';
        ctx.lineWidth = 1.5 / state.scale;
        ctx.setLineDash([4 / state.scale, 4 / state.scale]);
        ctx.strokeRect(minX - pad, minY - pad, (maxX - minX) + pad * 2, (maxY - minY) + pad * 2);
        ctx.restore();
      }
    }

    // Draw marquee box
    if (state.isMarquee && state.marqueeStart && state.marqueeEnd) {
      const ms = state.marqueeStart;
      const me = state.marqueeEnd;
      const mx = Math.min(ms.x, me.x);
      const my = Math.min(ms.y, me.y);
      const mw = Math.abs(me.x - ms.x);
      const mh = Math.abs(me.y - ms.y);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.strokeStyle = '#339af0';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(mx, my, mw, mh);
      ctx.fillStyle = 'rgba(51, 154, 240, 0.08)';
      ctx.fillRect(mx, my, mw, mh);
      ctx.restore();
    }

    ctx.restore();

    // Update status
    statusSize.textContent = state.bgImage ? `${state.bgWidth} × ${state.bgHeight}` : '0 × 0';
    statusScale.textContent = Math.round(state.scale * 100) + '%';
    const wpos = screenToWorld(state.lastMouse.x, state.lastMouse.y);
    statusPos.textContent = `${Math.round(wpos.x)}, ${Math.round(wpos.y)}`;
  }

  function findBezierTForDistanceFromEnd(p0, p1, p2, dist) {
    let lo = 0, hi = 1;
    for (let iter = 0; iter < 24; iter++) {
      const mid = (lo + hi) / 2;
      const pt = quadBezierPoint(p0, p1, p2, mid);
      const d = Math.hypot(pt.x - p2.x, pt.y - p2.y);
      if (d < dist) hi = mid;
      else lo = mid;
    }
    return (lo + hi) / 2;
  }

  function drawShape(c, s, isSelected, sourceCanvas = null) {
    c.strokeStyle = s.color;
    c.fillStyle = s.color;
    c.lineWidth = s.width;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.setLineDash(getDashArray(s));

    const center = shapeCenter(s, c);
    const hasAngle = (s.angle || 0) !== 0;

    if (hasAngle) {
      c.save();
      c.translate(center.x, center.y);
      c.rotate(s.angle);
    }

    if (s.type === 'rect') {
      const dx = hasAngle ? -s.w/2 : s.x;
      const dy = hasAngle ? -s.h/2 : s.y;
      if (s.fill) c.fillRect(dx, dy, s.w, s.h);
      else c.strokeRect(dx, dy, s.w, s.h);
    } else if (s.type === 'circle') {
      const cx = hasAngle ? 0 : s.x + s.w/2;
      const cy = hasAngle ? 0 : s.y + s.h/2;
      c.beginPath();
      c.ellipse(cx, cy, Math.abs(s.w)/2, Math.abs(s.h)/2, 0, 0, Math.PI * 2);
      if (s.fill) c.fill();
      else c.stroke();
    } else if (s.type === 'image') {
      const img = getCachedImage(s.src);
      if (img && img.complete && img.naturalWidth > 0) {
        c.drawImage(img, hasAngle ? -s.w/2 : s.x, hasAngle ? -s.h/2 : s.y, s.w, s.h);
      }
    } else if (s.type === 'polygon') {
      if (s.points.length < 3) { if (hasAngle) c.restore(); return; }
      c.beginPath();
      s.points.forEach((p, i) => {
        const x = hasAngle ? p.x - center.x : p.x;
        const y = hasAngle ? p.y - center.y : p.y;
        if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
      });
      c.closePath();
      if (s.fill) c.fill();
      else c.stroke();
    } else if (s.type === 'angle') {
      const ox = hasAngle ? 0 : s.x;
      const oy = hasAngle ? 0 : s.y;
      const e1x = s.r1 * Math.cos(s.a1);
      const e1y = s.r1 * Math.sin(s.a1);
      const e2x = s.r2 * Math.cos(s.a2);
      const e2y = s.r2 * Math.sin(s.a2);
      c.beginPath();
      c.moveTo(ox, oy); c.lineTo(ox + e1x, oy + e1y);
      c.moveTo(ox, oy); c.lineTo(ox + e2x, oy + e2y);
      c.stroke();

      const spread = Math.abs(angleSpread(s));
      const spreadDeg = Math.round(spread * 180 / Math.PI);

      if (spreadDeg === 90) {
        const size = Math.min(16, s.r1 * 0.3, s.r2 * 0.3);
        if (size > 2) {
          c.save();
          c.strokeStyle = s.color;
          c.lineWidth = Math.max(1, s.width * 0.8);
          c.setLineDash([]);
          c.beginPath();
          const u1x = Math.cos(s.a1), u1y = Math.sin(s.a1);
          const u2x = Math.cos(s.a2), u2y = Math.sin(s.a2);
          c.moveTo(ox + size * u1x, oy + size * u1y);
          c.lineTo(ox + size * u1x + size * u2x, oy + size * u1y + size * u2y);
          c.lineTo(ox + size * u2x, oy + size * u2y);
          c.stroke();
          c.restore();
        }
      } else {
        const arcR = Math.min(20, s.r1 * 0.25, s.r2 * 0.25);
        if (arcR > 2) {
          c.beginPath();
          let start = s.a1, end = s.a2;
          let anticlockwise = false;
          if (end < start) { const tmp = start; start = end; end = tmp; anticlockwise = true; }
          if (end - start > Math.PI) anticlockwise = !anticlockwise;
          c.arc(ox, oy, arcR, start, end, anticlockwise);
          c.stroke();
        }
      }

      const textR = Math.max(28, Math.min(s.r1, s.r2) * 0.35);
      const mid = Math.atan2(Math.sin(s.a1) + Math.sin(s.a2), Math.cos(s.a1) + Math.cos(s.a2));
      const tx = textR * Math.cos(mid);
      const ty = textR * Math.sin(mid);
      c.save();
      c.font = `bold ${s.fontSize || 20}px sans-serif`;
      c.fillStyle = s.color;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(spreadDeg + '°', ox + tx, oy + ty);
      c.restore();
    } else if (s.type === 'line' || s.type === 'arrow') {
      const pts = ensureLinePoints(s);
      if (pts.length < 2) { if (hasAngle) c.restore(); return; }
      const toLocalIfNeeded = p => hasAngle ? {x: p.x - center.x, y: p.y - center.y} : p;
      const isArrow = s.type === 'arrow';
      const headLen = isArrow ? Math.max(10, s.width * 3) : 0;
      const inset = isArrow ? headLen * Math.cos(Math.PI / 6) : 0;
      c.beginPath();
      const p0 = toLocalIfNeeded(pts[0]);
      c.moveTo(p0.x, p0.y);
      let i = 1;
      let lastAngle = 0;
      let lastPt = p0;
      while (i < pts.length) {
        const p1Raw = pts[i];
        const p1 = toLocalIfNeeded(p1Raw);
        const isLastSeg = i + (p1Raw.cp && i + 1 < pts.length ? 2 : 1) >= pts.length;
        if (p1Raw.cp && i + 1 < pts.length) {
          const p2 = toLocalIfNeeded(pts[i + 1]);
          if (isArrow && isLastSeg) {
            const endLocal = p2;
            const cpLocal = p1;
            const startLocal = lastPt;
            const bezierLen = Math.hypot(endLocal.x - startLocal.x, endLocal.y - startLocal.y);
            if (bezierLen > inset) {
              const t = findBezierTForDistanceFromEnd(startLocal, cpLocal, endLocal, inset);
              if (t > 0 && t < 1) {
                const q0 = lerpPoint(startLocal, cpLocal, t);
                const q1 = lerpPoint(cpLocal, endLocal, t);
                const q = lerpPoint(q0, q1, t);
                c.quadraticCurveTo(q0.x, q0.y, q.x, q.y);
              } else {
                c.quadraticCurveTo(cpLocal.x, cpLocal.y, endLocal.x, endLocal.y);
              }
            }
            lastAngle = Math.atan2(endLocal.y - cpLocal.y, endLocal.x - cpLocal.x);
            lastPt = endLocal;
          } else {
            c.quadraticCurveTo(p1.x, p1.y, p2.x, p2.y);
            lastAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
            lastPt = p2;
          }
          i += 2;
        } else {
          if (isArrow && isLastSeg) {
            const segLen = Math.hypot(p1.x - lastPt.x, p1.y - lastPt.y);
            if (segLen > inset) {
              const ratio = (segLen - inset) / segLen;
              const endX = lastPt.x + (p1.x - lastPt.x) * ratio;
              const endY = lastPt.y + (p1.y - lastPt.y) * ratio;
              c.lineTo(endX, endY);
            }
            lastAngle = Math.atan2(p1.y - lastPt.y, p1.x - lastPt.x);
            lastPt = p1;
          } else {
            c.lineTo(p1.x, p1.y);
            lastAngle = Math.atan2(p1.y - lastPt.y, p1.x - lastPt.x);
            lastPt = p1;
          }
          i += 1;
        }
      }
      if (isArrow) c.lineCap = 'butt';
      c.stroke();
      if (isArrow) {
        c.lineCap = 'round';
        drawArrowHead(c, lastPt.x, lastPt.y, lastAngle, s.width);
      }
    } else if (s.type === 'pen') {
      if (s.points.length < 2) { if (hasAngle) c.restore(); return; }
      c.beginPath();
      s.points.forEach((p, i) => {
        const x = hasAngle ? p.x - center.x : p.x;
        const y = hasAngle ? p.y - center.y : p.y;
        if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
      });
      c.stroke();
    } else if (s.type === 'text') {
      const fontSize = s.fontSize != null ? s.fontSize : (s.width * 2 + 12);
      c.font = `${fontSize}px sans-serif`;
      c.textBaseline = 'top';
      if (hasAngle) {
        const w = c.measureText(s.text).width;
        const h = fontSize * 1.2;
        c.fillText(s.text, -w/2, -h/2);
      } else {
        c.fillText(s.text, s.x, s.y);
      }
    } else if (s.type === 'mosaic') {
      const mosaicCache = getMosaicCache(s.mosaicBlur || 12);
      if (mosaicCache) {
        c.save();
        c.beginPath();
        if (hasAngle) c.rect(-s.w/2, -s.h/2, s.w, s.h);
        else c.rect(s.x, s.y, s.w, s.h);
        c.clip();
        if (hasAngle) c.drawImage(mosaicCache, s.x, s.y, s.w, s.h, -s.w/2, -s.h/2, s.w, s.h);
        else c.drawImage(mosaicCache, s.x, s.y, s.w, s.h, s.x, s.y, s.w, s.h);
        c.restore();
      } else {
        c.fillStyle = 'rgba(200,200,200,0.8)';
        if (hasAngle) c.fillRect(-s.w/2, -s.h/2, s.w, s.h);
        else c.fillRect(s.x, s.y, s.w, s.h);
      }
    } else if (s.type === 'magnifier') {
      const tx = s.tx != null ? s.tx : s.x;
      const ty = s.ty != null ? s.ty : s.y;
      const zoom = s.zoom || 2;
      const r = s.r;

      const src = sourceCanvas || state.bgImage;
      if (src) {
        c.save();
        c.translate(s.x, s.y);
        c.beginPath();
        c.arc(0, 0, r, 0, Math.PI * 2);
        c.clip();
        const srcSize = (r * 2) / zoom;
        const sx = tx - srcSize / 2;
        const sy = ty - srcSize / 2;
        c.drawImage(src, sx, sy, srcSize, srcSize, -r, -r, r * 2, r * 2);
        c.restore();
      }

      // Link line between circles, staying outside the magnifier
      const dx = tx - s.x;
      const dy = ty - s.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.1) {
        const angle = Math.atan2(dy, dx);
        const startX = tx - (r / zoom) * Math.cos(angle);
        const startY = ty - (r / zoom) * Math.sin(angle);
        const endX = s.x + r * Math.cos(angle);
        const endY = s.y + r * Math.sin(angle);
        c.save();
        c.strokeStyle = s.color;
        c.lineWidth = s.width;
        c.setLineDash([4, 4]);
        c.beginPath();
        c.moveTo(startX, startY);
        c.lineTo(endX, endY);
        c.stroke();
        c.restore();
      }

      // Magnifier border
      c.save();
      c.translate(s.x, s.y);
      c.setLineDash([]);
      c.beginPath();
      c.arc(0, 0, r, 0, Math.PI * 2);
      c.stroke();
      c.restore();

      // Anchor source circle
      c.save();
      c.translate(tx, ty);
      c.beginPath();
      c.arc(0, 0, r / zoom, 0, Math.PI * 2);
      c.setLineDash([4, 4]);
      c.stroke();
      c.restore();
    } else if (s.type === 'stripMagnifier') {
      const tx = s.tx != null ? s.tx : s.x + s.w/2;
      const ty = s.ty != null ? s.ty : s.y + s.h/2;
      const zoom = s.zoom || 2;
      const cx = s.x + s.w/2;
      const cy = s.y + s.h/2;

      const src = sourceCanvas || state.bgImage;
      if (src) {
        c.save();
        c.beginPath();
        c.rect(s.x, s.y, s.w, s.h);
        c.clip();
        const srcW = s.w / zoom;
        const srcH = s.h / zoom;
        const sx = tx - srcW / 2;
        const sy = ty - srcH / 2;
        c.drawImage(src, sx, sy, srcW, srcH, s.x, s.y, s.w, s.h);
        c.restore();
      }

      // Link line between source and magnifier, staying outside both rectangles
      const dx = tx - cx;
      const dy = ty - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.1) {
        const angle = Math.atan2(dy, dx);
        const srcW = s.w / zoom;
        const srcH = s.h / zoom;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const srcEdge = Math.min(
          Math.abs(cos) < 1e-6 ? Infinity : (srcW/2) / Math.abs(cos),
          Math.abs(sin) < 1e-6 ? Infinity : (srcH/2) / Math.abs(sin)
        );
        const magEdge = Math.min(
          Math.abs(cos) < 1e-6 ? Infinity : (s.w/2) / Math.abs(cos),
          Math.abs(sin) < 1e-6 ? Infinity : (s.h/2) / Math.abs(sin)
        );
        const startX = tx - srcEdge * cos;
        const startY = ty - srcEdge * sin;
        const endX = cx + magEdge * cos;
        const endY = cy + magEdge * sin;
        c.save();
        c.strokeStyle = s.color;
        c.lineWidth = s.width;
        c.setLineDash([4, 4]);
        c.beginPath();
        c.moveTo(startX, startY);
        c.lineTo(endX, endY);
        c.stroke();
        c.restore();
      }

      // Magnifier border
      c.save();
      c.setLineDash([]);
      c.strokeRect(s.x, s.y, s.w, s.h);
      c.restore();

      // Anchor source rectangle
      c.save();
      c.strokeStyle = s.color;
      c.lineWidth = s.width;
      c.setLineDash([4, 4]);
      const srcW = s.w / zoom;
      const srcH = s.h / zoom;
      c.strokeRect(tx - srcW/2, ty - srcH/2, srcW, srcH);
      c.restore();
    }

    if (hasAngle) c.restore();
  }

  function drawArrowHead(c, x, y, angle, width) {
    const headLen = Math.max(10, width * 3);
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x - headLen * Math.cos(angle - Math.PI / 6), y - headLen * Math.sin(angle - Math.PI / 6));
    c.lineTo(x - headLen * Math.cos(angle + Math.PI / 6), y - headLen * Math.sin(angle + Math.PI / 6));
    c.closePath();
    c.fill();
  }

  function shapeLocalBBox(s, c = ctx) {
    if (s.type === 'rect' || s.type === 'mosaic' || s.type === 'circle' || s.type === 'image') {
      return {x: -s.w/2, y: -s.h/2, w: s.w, h: s.h};
    } else if (s.type === 'magnifier') {
      return {x: -s.r, y: -s.r, w: s.r*2, h: s.r*2};
    } else if (s.type === 'stripMagnifier') {
      const tx = (s.tx != null ? s.tx : s.x + s.w/2) - (s.x + s.w/2);
      const ty = (s.ty != null ? s.ty : s.y + s.h/2) - (s.y + s.h/2);
      const srcW = (s.w / (s.zoom || 2)) / 2;
      const srcH = (s.h / (s.zoom || 2)) / 2;
      const minX = Math.min(-s.w/2, tx - srcW);
      const minY = Math.min(-s.h/2, ty - srcH);
      const maxX = Math.max(s.w/2, tx + srcW);
      const maxY = Math.max(s.h/2, ty + srcH);
      return {x: minX, y: minY, w: maxX - minX, h: maxY - minY};
    } else if (s.type === 'angle') {
      const e1x = s.r1 * Math.cos(s.a1);
      const e1y = s.r1 * Math.sin(s.a1);
      const e2x = s.r2 * Math.cos(s.a2);
      const e2y = s.r2 * Math.sin(s.a2);
      const minX = Math.min(0, e1x, e2x);
      const minY = Math.min(0, e1y, e2y);
      const maxX = Math.max(0, e1x, e2x);
      const maxY = Math.max(0, e1y, e2y);
      return {x: minX, y: minY, w: maxX - minX, h: maxY - minY};
    } else if (s.type === 'polygon') {
      const cen = shapeCenter(s);
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      s.points.forEach(p => {
        minX = Math.min(minX, p.x - cen.x); minY = Math.min(minY, p.y - cen.y);
        maxX = Math.max(maxX, p.x - cen.x); maxY = Math.max(maxY, p.y - cen.y);
      });
      return {x: minX, y: minY, w: maxX - minX, h: maxY - minY};
    } else if (s.type === 'line' || s.type === 'arrow') {
      const pts = ensureLinePoints(s);
      const cen = shapeCenter(s);
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      pts.forEach(p => {
        minX = Math.min(minX, p.x - cen.x); minY = Math.min(minY, p.y - cen.y);
        maxX = Math.max(maxX, p.x - cen.x); maxY = Math.max(maxY, p.y - cen.y);
      });
      return {x: minX, y: minY, w: maxX - minX, h: maxY - minY};
    } else if (s.type === 'text') {
      const fontSize = s.fontSize != null ? s.fontSize : (s.width * 2 + 12);
      c.font = `${fontSize}px sans-serif`;
      const w = c.measureText(s.text).width;
      const h = fontSize * 1.2;
      return {x: -w/2, y: -h/2, w: w, h: h};
    } else if (s.type === 'pen') {
      const cen = shapeCenter(s);
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      s.points.forEach(p => {
        minX = Math.min(minX, p.x - cen.x); minY = Math.min(minY, p.y - cen.y);
        maxX = Math.max(maxX, p.x - cen.x); maxY = Math.max(maxY, p.y - cen.y);
      });
      return {x: minX, y: minY, w: maxX - minX, h: maxY - minY};
    }
    return {x:0, y:0, w:0, h:0};
  }

  function drawSelectionUI(c, s) {
    const center = shapeCenter(s, c);
    c.save();
    c.translate(center.x, center.y);
    c.rotate(s.angle || 0);

    const bbox = shapeLocalBBox(s, c);
    const pad = 6 / state.scale;
    c.strokeStyle = '#339af0';
    c.lineWidth = 1 / state.scale;
    c.setLineDash([4 / state.scale, 4 / state.scale]);
    if (s.type === 'magnifier') {
      c.beginPath();
      c.arc(0, 0, s.r + pad, 0, Math.PI * 2);
      c.stroke();
    } else {
      c.strokeRect(bbox.x - pad, bbox.y - pad, bbox.w + pad*2, bbox.h + pad*2);
    }
    c.setLineDash([]);

    if (s.type === 'stripMagnifier') {
      const sx = (s.tx != null ? s.tx : s.x + s.w/2) - (s.x + s.w/2);
      const sy = (s.ty != null ? s.ty : s.y + s.h/2) - (s.y + s.h/2);
      const srw = (s.w / (s.zoom || 2)) / 2;
      const srh = (s.h / (s.zoom || 2)) / 2;
      c.save();
      c.strokeStyle = '#ff6b35';
      c.lineWidth = 1 / state.scale;
      c.setLineDash([4 / state.scale, 4 / state.scale]);
      c.strokeRect(sx - srw - pad, sy - srh - pad, srw*2 + pad*2, srh*2 + pad*2);
      c.restore();
    }

    const handles = getLocalHandles(s, bbox);
    // Draw control point helper lines for line/arrow
    if (s.type === 'line' || s.type === 'arrow') {
      c.save();
      c.strokeStyle = '#339af0';
      c.lineWidth = 1 / state.scale;
      c.setLineDash([2 / state.scale, 2 / state.scale]);
      handles.forEach((h, i) => {
        if (!h.cp) return;
        const prev = handles[i - 1];
        const next = handles[i + 1];
        c.beginPath();
        if (prev) { c.moveTo(prev.x, prev.y); c.lineTo(h.x, h.y); }
        if (next) { c.moveTo(h.x, h.y); c.lineTo(next.x, next.y); }
        c.stroke();
      });
      c.restore();
    }
    c.fillStyle = '#fff';
    c.strokeStyle = '#339af0';
    const r = 4 / state.scale;
    handles.forEach(h => {
      if ((s.type === 'magnifier' || s.type === 'stripMagnifier') && h.name === 'anchor') {
        c.save();
        c.strokeStyle = '#ff6b35';
        c.lineWidth = 1 / state.scale;
        c.beginPath();
        c.moveTo(0, 0);
        c.lineTo(h.x, h.y);
        c.stroke();
        c.restore();
      }
      const isAnchorLike = h.name === 'anchor' || h.name === 'bodyAnchor';
      if (h.cp || isAnchorLike) {
        c.save();
        c.fillStyle = '#ff6b35';
        c.fillRect(h.x - r, h.y - r, r*2, r*2);
        c.strokeRect(h.x - r, h.y - r, r*2, r*2);
        c.restore();
      } else {
        c.fillRect(h.x - r, h.y - r, r*2, r*2);
        c.strokeRect(h.x - r, h.y - r, r*2, r*2);
      }
    });
    c.restore();
  }

  function getLocalHandles(s, bbox) {
    const handles = [];
    const noResize = Math.abs(s.angle || 0) > 0.01;

    if (!noResize && (s.type === 'rect' || s.type === 'mosaic' || s.type === 'circle' || s.type === 'image')) {
      const cx = bbox.x + bbox.w/2;
      const cy = bbox.y + bbox.h/2;
      handles.push({name:'nw', x:bbox.x, y:bbox.y});
      handles.push({name:'n', x:cx, y:bbox.y});
      handles.push({name:'ne', x:bbox.x+bbox.w, y:bbox.y});
      handles.push({name:'e', x:bbox.x+bbox.w, y:cy});
      handles.push({name:'se', x:bbox.x+bbox.w, y:bbox.y+bbox.h});
      handles.push({name:'s', x:cx, y:bbox.y+bbox.h});
      handles.push({name:'sw', x:bbox.x, y:bbox.y+bbox.h});
      handles.push({name:'w', x:bbox.x, y:cy});
    } else if (!noResize && s.type === 'stripMagnifier') {
      const bodyBbox = {x: -s.w/2, y: -s.h/2, w: s.w, h: s.h};
      handles.push({name:'nw', x:bodyBbox.x, y:bodyBbox.y});
      handles.push({name:'n', x:0, y:bodyBbox.y});
      handles.push({name:'ne', x:bodyBbox.x+bodyBbox.w, y:bodyBbox.y});
      handles.push({name:'e', x:bodyBbox.x+bodyBbox.w, y:0});
      handles.push({name:'se', x:bodyBbox.x+bodyBbox.w, y:bodyBbox.y+bodyBbox.h});
      handles.push({name:'s', x:0, y:bodyBbox.y+bodyBbox.h});
      handles.push({name:'sw', x:bodyBbox.x, y:bodyBbox.y+bodyBbox.h});
      handles.push({name:'w', x:bodyBbox.x, y:0});
      handles.push({name:'bodyAnchor', x:0, y:0});
      const atx = (s.tx != null ? s.tx : s.x + s.w/2) - (s.x + s.w/2);
      const aty = (s.ty != null ? s.ty : s.y + s.h/2) - (s.y + s.h/2);
      handles.push({name:'anchor', x: atx, y: aty});
      const srw = (s.w / (s.zoom || 2)) / 2;
      const srh = (s.h / (s.zoom || 2)) / 2;
      handles.push({name:'src-nw', x:atx-srw, y:aty-srh});
      handles.push({name:'src-n', x:atx, y:aty-srh});
      handles.push({name:'src-ne', x:atx+srw, y:aty-srh});
      handles.push({name:'src-e', x:atx+srw, y:aty});
      handles.push({name:'src-se', x:atx+srw, y:aty+srh});
      handles.push({name:'src-s', x:atx, y:aty+srh});
      handles.push({name:'src-sw', x:atx-srw, y:aty+srh});
      handles.push({name:'src-w', x:atx-srw, y:aty});
    } else if (!noResize && s.type === 'magnifier') {
      const r = s.r;
      handles.push({name:'e', x:r, y:0});
      handles.push({name:'s', x:0, y:r});
      handles.push({name:'w', x:-r, y:0});
      handles.push({name:'n', x:0, y:-r});
      const atx = (s.tx != null ? s.tx : s.x) - s.x;
      const aty = (s.ty != null ? s.ty : s.y) - s.y;
      handles.push({name:'anchor', x: atx, y: aty});
    } else if (!noResize && s.type === 'polygon') {
      if (s.regular) {
        const cx = bbox.x + bbox.w/2;
        const cy = bbox.y + bbox.h/2;
        handles.push({name:'nw', x:bbox.x, y:bbox.y});
        handles.push({name:'n', x:cx, y:bbox.y});
        handles.push({name:'ne', x:bbox.x+bbox.w, y:bbox.y});
        handles.push({name:'e', x:bbox.x+bbox.w, y:cy});
        handles.push({name:'se', x:bbox.x+bbox.w, y:bbox.y+bbox.h});
        handles.push({name:'s', x:cx, y:bbox.y+bbox.h});
        handles.push({name:'sw', x:bbox.x, y:bbox.y+bbox.h});
        handles.push({name:'w', x:bbox.x, y:cy});
      } else {
        const cen = shapeCenter(s);
        s.points.forEach((p, idx) => {
          handles.push({name: 'pt-' + idx, x: p.x - cen.x, y: p.y - cen.y});
        });
      }
    } else if (!noResize && s.type === 'angle') {
      const e1x = s.r1 * Math.cos(s.a1);
      const e1y = s.r1 * Math.sin(s.a1);
      const e2x = s.r2 * Math.cos(s.a2);
      const e2y = s.r2 * Math.sin(s.a2);
      handles.push({name: 'pt-0', x: e1x, y: e1y});
      handles.push({name: 'pt-1', x: e2x, y: e2y});
    } else if (!noResize && (s.type === 'line' || s.type === 'arrow')) {
      const cen = shapeCenter(s);
      const pts = ensureLinePoints(s);
      pts.forEach((p, idx) => {
        handles.push({name: 'pt-' + idx, x: p.x - cen.x, y: p.y - cen.y, cp: p.cp});
      });
    }

    // Rotation handle (skip magnifier and strip magnifier)
    if (s.type !== 'magnifier' && s.type !== 'stripMagnifier') {
      const rotDist = 20 / state.scale;
      handles.push({name:'rot', x: 0, y: bbox.y - rotDist});
    }

    return handles;
  }

  // ===== Hit testing =====
  function hitHandle(pos) {
    if (!state.selectedId) return null;
    const s = state.shapes.find(x => x.id === state.selectedId);
    if (!s) return null;
    const localPos = toLocal(s, pos.x, pos.y);
    const bbox = shapeLocalBBox(s);
    const handles = getLocalHandles(s, bbox);
    const threshold = Math.max(8 / state.scale, 4);
    for (let i = handles.length - 1; i >= 0; i--) {
      const h = handles[i];
      if (Math.hypot(localPos.x - h.x, localPos.y - h.y) <= threshold) {
        return {shape: s, handle: h.name};
      }
    }
    return null;
  }

  function hitShape(pos) {
    for (let i = state.shapes.length - 1; i >= 0; i--) {
      const s = state.shapes[i];
      if (shapeContains(s, pos)) return s;
    }
    return null;
  }

  function shapeContains(s, pos) {
    const lp = toLocal(s, pos.x, pos.y);
    if (s.type === 'rect' || s.type === 'mosaic') {
      return lp.x >= -s.w/2 - 4 && lp.x <= s.w/2 + 4 && lp.y >= -s.h/2 - 4 && lp.y <= s.h/2 + 4;
    } else if (s.type === 'circle') {
      const rx = s.w / 2, ry = s.h / 2;
      const tol = 4;
      if (rx === 0 && ry === 0) return Math.hypot(lp.x, lp.y) <= tol;
      return (lp.x * lp.x) / ((rx + tol) * (rx + tol)) + (lp.y * lp.y) / ((ry + tol) * (ry + tol)) <= 1;
    } else if (s.type === 'image') {
      return lp.x >= -s.w/2 - 4 && lp.x <= s.w/2 + 4 && lp.y >= -s.h/2 - 4 && lp.y <= s.h/2 + 4;
    } else if (s.type === 'polygon') {
      const c = shapeCenter(s);
      const pts = s.points;
      if (pts.length < 3) return false;
      const threshold = Math.max(s.width + 6, 8);
      for (let j = 0; j < pts.length; j++) {
        const p1 = {x: pts[j].x - c.x, y: pts[j].y - c.y};
        const p2 = {x: pts[(j + 1) % pts.length].x - c.x, y: pts[(j + 1) % pts.length].y - c.y};
        if (distToSegment(lp, p1, p2) <= threshold) return true;
      }
      return false;
    } else if (s.type === 'magnifier') {
      return Math.hypot(lp.x, lp.y) <= s.r + 4;
    } else if (s.type === 'stripMagnifier') {
      if (lp.x >= -s.w/2 - 4 && lp.x <= s.w/2 + 4 && lp.y >= -s.h/2 - 4 && lp.y <= s.h/2 + 4) return true;
      const sx = (s.tx != null ? s.tx : s.x + s.w/2) - (s.x + s.w/2);
      const sy = (s.ty != null ? s.ty : s.y + s.h/2) - (s.y + s.h/2);
      const srw = (s.w / (s.zoom || 2)) / 2;
      const srh = (s.h / (s.zoom || 2)) / 2;
      if (lp.x >= sx - srw - 4 && lp.x <= sx + srw + 4 && lp.y >= sy - srh - 4 && lp.y <= sy + srh + 4) return true;
      return false;
    } else if (s.type === 'angle') {
      const e1x = s.r1 * Math.cos(s.a1);
      const e1y = s.r1 * Math.sin(s.a1);
      const e2x = s.r2 * Math.cos(s.a2);
      const e2y = s.r2 * Math.sin(s.a2);
      const tol = Math.max(s.width + 6, 8);
      if (distToSegment(lp, {x:0,y:0}, {x:e1x,y:e1y}) <= tol) return true;
      if (distToSegment(lp, {x:0,y:0}, {x:e2x,y:e2y}) <= tol) return true;
      const mid = Math.atan2(Math.sin(s.a1) + Math.sin(s.a2), Math.cos(s.a1) + Math.cos(s.a2));
      const textR = Math.max(28, Math.min(s.r1, s.r2) * 0.35);
      const textPos = {x: textR * Math.cos(mid), y: textR * Math.sin(mid)};
      if (Math.hypot(lp.x - textPos.x, lp.y - textPos.y) <= 16) return true;
      return false;
    } else if (s.type === 'line' || s.type === 'arrow') {
      const c = shapeCenter(s);
      const pts = ensureLinePoints(s);
      for (let j = 0; j < pts.length - 1; ) {
        const p0 = {x: pts[j].x - c.x, y: pts[j].y - c.y};
        if (pts[j + 1].cp && j + 2 < pts.length) {
          const p1 = {x: pts[j + 1].x - c.x, y: pts[j + 1].y - c.y};
          const p2 = {x: pts[j + 2].x - c.x, y: pts[j + 2].y - c.y};
          if (distToQuadraticBezier(lp, p0, p1, p2) <= Math.max(s.width + 6, 8)) return true;
          j += 2;
        } else {
          const p1 = {x: pts[j + 1].x - c.x, y: pts[j + 1].y - c.y};
          if (distToSegment(lp, p0, p1) <= Math.max(s.width + 6, 8)) return true;
          j += 1;
        }
      }
      return false;
    } else if (s.type === 'text') {
      const b = shapeLocalBBox(s);
      return lp.x >= b.x && lp.x <= b.x + b.w && lp.y >= b.y && lp.y <= b.y + b.h;
    } else if (s.type === 'pen') {
      const c = shapeCenter(s);
      for (let j = 0; j < s.points.length - 1; j++) {
        const p1 = {x: s.points[j].x - c.x, y: s.points[j].y - c.y};
        const p2 = {x: s.points[j+1].x - c.x, y: s.points[j+1].y - c.y};
        if (distToSegment(lp, p1, p2) <= Math.max(s.width + 6, 8)) return true;
      }
      return false;
    }
    return false;
  }

  function distToSegment(p, v, w) {
    const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
  }

  function distToQuadraticBezier(p, p0, p1, p2) {
    // Flatness test: if control point is close to the line p0-p2, approximate as segment
    const flatTol = 0.5;
    const dx = p2.x - p0.x, dy = p2.y - p0.y;
    const len2 = dx * dx + dy * dy;
    const distCp = len2 === 0
      ? Math.hypot(p1.x - p0.x, p1.y - p0.y)
      : Math.abs(dy * p1.x - dx * p1.y + p2.x * p0.y - p2.y * p0.x) / Math.sqrt(len2);
    if (distCp <= flatTol) {
      return distToSegment(p, p0, p2);
    }
    // Subdivide at t=0.5
    const m0 = {x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2};
    const m1 = {x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2};
    const mm = {x: (m0.x + m1.x) / 2, y: (m0.y + m1.y) / 2};
    const d1 = distToQuadraticBezier(p, p0, m0, mm);
    const d2 = distToQuadraticBezier(p, mm, m1, p2);
    return Math.min(d1, d2);
  }

  // ===== Mouse interactions =====
  function onMouseDown(e) {
    if (!state.bgImage) return;
    const m = getMousePos(e);
    state.lastMouse = m;

    // Middle mouse or space -> pan
    if (e.button === 1 || (e.button === 0 && state.spaceDown)) {
      e.preventDefault();
      state.isPanning = true;
      state.dragStart = {x: m.x, y: m.y, ox: state.offsetX, oy: state.offsetY};
      updateCursor();
      return;
    }

    if (e.button !== 0) return;
    const pos = screenToWorld(m.x, m.y);

    if (state.tool === 'select') {
      const h = hitHandle(pos);
      if (h && state.selectedIds.length <= 1) {
        recordState();
        state.draggedHandle = h.handle;
        if (h.handle === 'rot') {
          state.isRotating = true;
          state.dragStart = {x: pos.x, y: pos.y};
          state.dragOrigin = JSON.parse(JSON.stringify(h.shape));
          updateCursor();
          return;
        }
        state.isResizing = true;
        state.resizeHandle = h.handle;
        state.dragStart = {x: pos.x, y: pos.y};
        state.dragOrigin = JSON.parse(JSON.stringify(h.shape));
        updateCursor();
        return;
      }
      const s = hitShape(pos);
      if (s) {
        recordState();
        if (state.selectedIds.length > 1 && state.selectedIds.includes(s.id)) {
          // Start group drag for multi-selection
          state.draggedHandle = null;
          state.isDragging = true;
          state.dragStart = {x: pos.x, y: pos.y};
          state.dragOrigin = null;
          state.groupDragOrigins = state.selectedIds.map(id => {
            const shape = state.shapes.find(x => x.id === id);
            return {id, origin: JSON.parse(JSON.stringify(shape))};
          });
          updateCursor();
          draw();
          return;
        }
        state.selectedId = s.id;
        state.selectedIds = [s.id];
        state.draggedHandle = null;
        state.isDragging = true;
        state.dragStart = {x: pos.x, y: pos.y};
        state.dragOrigin = JSON.parse(JSON.stringify(s));
        updateSelectionUI();
        updateCursor();
        draw();
        return;
      }
      // Start marquee selection
      state.isMarquee = true;
      state.marqueeStart = {x: m.x, y: m.y};
      state.marqueeEnd = {x: m.x, y: m.y};
      state.selectedId = null;
      state.selectedIds = [];
      state.draggedHandle = null;
      updateSelectionUI();
      draw();
      return;
    }

    // Drawing tools
    if (state.tool === 'picker') {
      hidePickerPreview();
      const sx = Math.floor(e.offsetX);
      const sy = Math.floor(e.offsetY);
      const pixel = ctx.getImageData(sx, sy, 1, 1).data;
      const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);
      state.color = hex;
      state.recentColor = hex;
      buildColorPicker(globalColorPicker, state.color, setGlobalColor, state.recentColor);
      if (state.selectedIds.length) {
        recordState();
        state.selectedIds.forEach(id => {
          const sel = state.shapes.find(x => x.id === id);
          if (sel) sel.color = hex;
        });
        draw();
        updateSelectionUI();
      }
      setTool('select');
      return;
    }

    recordState();
    state.isDrawing = true;
    state.dragStart = pos;
    if (state.tool === 'text') {
      const text = '双击编辑文字';
      state.tempShape = {
        id: uid(), type: 'text', x: pos.x, y: pos.y,
        text, color: state.color, width: state.width, angle: 0, fontSize: 10
      };
      finalizeTempShape();
      updateSelectionUI();
      const created = state.shapes.find(s => s.id === state.selectedId);
      if (created) setTimeout(() => startTextEdit(created), 0);
      draw();
    } else if (state.tool === 'pen') {
      state.tempShape = {
        id: uid(), type: 'pen', points: [pos],
        color: state.color, width: state.width, angle: 0
      };
    } else if (state.tool === 'rect') {
      state.tempShape = {
        id: uid(), type: 'rect', x: pos.x, y: pos.y, w: 0, h: 0,
        color: state.color, width: state.width, fill: false, angle: 0
      };
    } else if (state.tool === 'circle') {
      state.tempShape = {
        id: uid(), type: 'circle', x: pos.x, y: pos.y, w: 0, h: 0,
        color: state.color, width: state.width, fill: false, angle: 0
      };
    } else if (state.tool === 'polygon') {
      state.tempShape = {
        id: uid(), type: 'polygon', x: pos.x, y: pos.y, w: 0, h: 0,
        points: [],
        regular: polyRegularInput.checked,
        sides: parseInt(polySidesInput.value, 10) || 5,
        color: state.color, width: state.width, fill: false, angle: 0
      };
    } else if (state.tool === 'angle') {
      state.tempShape = {
        id: uid(), type: 'angle', x: pos.x, y: pos.y,
        r1: 0, r2: 0,
        a1: 0, a2: Math.PI / 2,
        color: state.color, width: state.width, fontSize: 20,
        angle: 0, dashType: 'solid', dashTight: 5
      };
    } else if (state.tool === 'mosaic') {
      if (state.isBlankCanvas && state.shapes.length === 0) return;
      state.tempShape = {
        id: uid(), type: 'mosaic', x: pos.x, y: pos.y, w: 0, h: 0,
        color: state.color, width: state.width, angle: 0, mosaicBlur: 12
      };
    } else if (state.tool === 'magnifier') {
      state.tempShape = {
        id: uid(), type: 'magnifier', x: pos.x, y: pos.y, r: 0,
        tx: pos.x, ty: pos.y,
        color: state.color, width: state.width, angle: 0, zoom: state.defaultZoom
      };
    } else if (state.tool === 'stripMagnifier') {
      state.tempShape = {
        id: uid(), type: 'stripMagnifier', sx: pos.x, sy: pos.y, sw: 0, sh: 0,
        color: state.color, width: state.width, angle: 0, zoom: state.defaultZoom
      };
    } else if (state.tool === 'line' || state.tool === 'arrow') {
      state.tempShape = {
        id: uid(), type: state.tool,
        points: [{x: pos.x, y: pos.y}, {x: pos.x, y: pos.y}],
        color: state.color, width: state.width, angle: 0
      };
    }
    draw();
  }

  function onMouseMove(e) {
    const m = getMousePos(e);
    state.lastMouse = m;

    if (state.isPanning) {
      state.offsetX = state.dragStart.ox + (m.x - state.dragStart.x);
      state.offsetY = state.dragStart.oy + (m.y - state.dragStart.y);
      draw();
      return;
    }

    if (!state.bgImage) {
      statusPos.textContent = `${Math.round(m.x)}, ${Math.round(m.y)}`;
      return;
    }

    if (state.tool === 'picker') {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      if (mx >= 0 && mx <= canvas.width && my >= 0 && my <= canvas.height) {
        updatePickerPreview(mx, my);
      } else {
        hidePickerPreview();
      }
      return;
    }

    const pos = screenToWorld(m.x, m.y);

    if (state.tool === 'select') {
      if (state.isRotating) {
        const s = state.shapes.find(x => x.id === state.selectedId);
        if (s) applyRotate(s, pos.x, pos.y, state.dragOrigin);
        draw();
        return;
      }
      if (state.isResizing) {
        const s = state.shapes.find(x => x.id === state.selectedId);
        if (s) applyResize(s, state.resizeHandle, pos.x - state.dragStart.x, pos.y - state.dragStart.y, state.dragOrigin);
        draw();
        return;
      }
      if (state.isDragging) {
        const dx = pos.x - state.dragStart.x;
        const dy = pos.y - state.dragStart.y;
        if (state.groupDragOrigins && state.groupDragOrigins.length) {
          state.groupDragOrigins.forEach(item => {
            const s = state.shapes.find(x => x.id === item.id);
            if (s) applyMove(s, dx, dy, item.origin);
          });
        } else {
          const s = state.shapes.find(x => x.id === state.selectedId);
          if (s) applyMove(s, dx, dy, state.dragOrigin);
        }
        draw();
        return;
      }
      if (state.isMarquee) {
        state.marqueeEnd = {x: m.x, y: m.y};
        draw();
        return;
      }
      // Hover cursor
      const h = hitHandle(pos);
      if (h && state.selectedIds.length <= 1) {
        canvas.style.cursor = handleCursor(h.handle);
      } else if (hitShape(pos)) {
        canvas.style.cursor = 'move';
      } else {
        canvas.style.cursor = 'default';
      }
      return;
    }

    if (!state.isDrawing || !state.tempShape) return;

    if (state.tempShape.type === 'rect' || state.tempShape.type === 'mosaic' || state.tempShape.type === 'circle' || state.tempShape.type === 'polygon') {
      let dx = pos.x - state.tempShape.x;
      let dy = pos.y - state.tempShape.y;
      if (e.shiftKey && (state.tempShape.type === 'rect' || state.tempShape.type === 'circle' || state.tempShape.type === 'polygon')) {
        const absMax = Math.max(Math.abs(dx), Math.abs(dy));
        const signX = dx >= 0 ? 1 : -1;
        const signY = dy >= 0 ? 1 : -1;
        dx = signX * absMax;
        dy = signY * absMax;
      }
      state.tempShape.w = dx;
      state.tempShape.h = dy;
      if (state.tempShape.type === 'polygon') {
        const cx = state.tempShape.x + state.tempShape.w / 2;
        const cy = state.tempShape.y + state.tempShape.h / 2;
        state.tempShape.points = generateRegularPolygonPoints(cx, cy, state.tempShape.w, state.tempShape.h, state.tempShape.sides);
      }
    } else if (state.tempShape.type === 'magnifier') {
      const dx = pos.x - state.dragStart.x;
      const dy = pos.y - state.dragStart.y;
      state.tempShape.r = Math.max(10, Math.hypot(dx, dy));
    } else if (state.tempShape.type === 'stripMagnifier') {
      let dx = pos.x - state.tempShape.sx;
      let dy = pos.y - state.tempShape.sy;
      state.tempShape.sw = dx;
      state.tempShape.sh = dy;
    } else if (state.tempShape.type === 'angle') {
      const dx = pos.x - state.tempShape.x;
      const dy = pos.y - state.tempShape.y;
      let r = Math.max(5, Math.hypot(dx, dy));
      let a = Math.atan2(dy, dx);
      if (e.shiftKey) {
        // constrain to symmetric 90deg for initial draw
        a = Math.round(a / (Math.PI / 2)) * (Math.PI / 2);
      }
      state.tempShape.r2 = r;
      state.tempShape.a2 = a;
      state.tempShape.r1 = r;
      state.tempShape.a1 = a - Math.PI / 2;
    } else if (state.tempShape.type === 'line' || state.tempShape.type === 'arrow') {
      state.tempShape.points[1] = {x: pos.x, y: pos.y};
    } else if (state.tempShape.type === 'pen') {
      state.tempShape.points.push(pos);
    }
    draw();
  }

  function onMouseUp(e) {
    if (state.isPanning) {
      state.isPanning = false;
      updateCursor();
      return;
    }
    if (state.isDragging) {
      state.isDragging = false;
      state.dragOrigin = null;
      state.groupDragOrigins = [];
      updateCursor();
      return;
    }
    if (state.isResizing) {
      state.isResizing = false;
      state.resizeHandle = null;
      state.dragOrigin = null;
      updateCursor();
      return;
    }
    if (state.isRotating) {
      state.isRotating = false;
      state.dragOrigin = null;
      updateCursor();
      return;
    }
    if (state.isMarquee) {
      state.isMarquee = false;
      const ms = state.marqueeStart;
      const me = state.marqueeEnd;
      const mx = Math.min(ms.x, me.x);
      const my = Math.min(ms.y, me.y);
      const mw = Math.abs(me.x - ms.x);
      const mh = Math.abs(me.y - ms.y);
      if (mw > 4 || mh > 4) {
        const m1 = screenToWorld(mx, my);
        const m2 = screenToWorld(mx + mw, my + mh);
        const bbox = {x: Math.min(m1.x, m2.x), y: Math.min(m1.y, m2.y), w: Math.abs(m2.x - m1.x), h: Math.abs(m2.y - m1.y)};
        const ids = [];
        state.shapes.forEach(s => {
          const c = shapeCenter(s);
          if (c.x >= bbox.x && c.x <= bbox.x + bbox.w && c.y >= bbox.y && c.y <= bbox.y + bbox.h) {
            ids.push(s.id);
          }
        });
        if (ids.length) {
          state.selectedIds = ids;
          state.selectedId = ids[0];
        }
      }
      state.marqueeStart = null;
      state.marqueeEnd = null;
      updateSelectionUI();
      draw();
      return;
    }
    if (state.isDrawing) {
      state.isDrawing = false;
      finalizeTempShape();
      updateCursor();
      return;
    }
  }

  function finalizeTempShape() {
    if (!state.tempShape) return;
    if (state.tempShape.type === 'rect' || state.tempShape.type === 'mosaic' || state.tempShape.type === 'circle' || state.tempShape.type === 'polygon') {
      if (state.tempShape.w < 0) {
        state.tempShape.x += state.tempShape.w;
        state.tempShape.w = -state.tempShape.w;
      }
      if (state.tempShape.h < 0) {
        state.tempShape.y += state.tempShape.h;
        state.tempShape.h = -state.tempShape.h;
      }
      if (state.tempShape.w < 2 && state.tempShape.h < 2) {
        state.tempShape = null; draw(); return;
      }
      if (state.tempShape.type === 'polygon') {
        const cx = state.tempShape.x + state.tempShape.w / 2;
        const cy = state.tempShape.y + state.tempShape.h / 2;
        state.tempShape.points = generateRegularPolygonPoints(cx, cy, state.tempShape.w, state.tempShape.h, state.tempShape.sides);
      }
    } else if (state.tempShape.type === 'magnifier') {
      if (state.tempShape.r < 10) {
        state.tempShape = null; draw(); return;
      }
    } else if (state.tempShape.type === 'stripMagnifier') {
      if (state.tempShape.sw < 0) {
        state.tempShape.sx += state.tempShape.sw;
        state.tempShape.sw = -state.tempShape.sw;
      }
      if (state.tempShape.sh < 0) {
        state.tempShape.sy += state.tempShape.sh;
        state.tempShape.sh = -state.tempShape.sh;
      }
      if (state.tempShape.sw < 10 || state.tempShape.sh < 10) {
        state.tempShape = null; draw(); return;
      }
      const zoom = state.tempShape.zoom || 2;
      const gapX = 100;
      // Force vertical boundary separation >= 50px (magnifier above source)
      state.tempShape.w = state.tempShape.sw * zoom;
      state.tempShape.h = state.tempShape.sh * zoom;
      const gapY = -50 - state.tempShape.sh / 2 - state.tempShape.h / 2;
      // Source rect center
      state.tempShape.tx = state.tempShape.sx + state.tempShape.sw / 2;
      state.tempShape.ty = state.tempShape.sy + state.tempShape.sh / 2;
      // Magnifier body size and position (upper-right of source)
      state.tempShape.x = state.tempShape.sx + state.tempShape.sw / 2 - state.tempShape.w / 2 + gapX;
      state.tempShape.y = state.tempShape.sy + state.tempShape.sh / 2 - state.tempShape.h / 2 + gapY;
      delete state.tempShape.sx;
      delete state.tempShape.sy;
      delete state.tempShape.sw;
      delete state.tempShape.sh;
    } else if (state.tempShape.type === 'angle') {
      if (state.tempShape.r2 < 5) {
        state.tempShape = null; draw(); return;
      }
    } else if (state.tempShape.type === 'line' || state.tempShape.type === 'arrow') {
      const p0 = state.tempShape.points[0];
      const p1 = state.tempShape.points[1];
      if (Math.hypot(p1.x - p0.x, p1.y - p0.y) < 2) {
        state.tempShape = null; draw(); return;
      }
    } else if (state.tempShape.type === 'pen') {
      if (state.tempShape.points.length < 2) {
        state.tempShape = null; draw(); return;
      }
    }
    state.shapes.push(state.tempShape);
    state.selectedId = state.tempShape.id;
    state.selectedIds = [state.tempShape.id];
    state.tempShape = null;
    updateSelectionUI();
    setTool('select');
    renderLayerList();
    draw();
  }

  function applyMove(s, dx, dy, origin) {
    const o = origin;
    if (s.type === 'text') {
      s.x = o.x + dx; s.y = o.y + dy;
    } else if (s.type === 'rect' || s.type === 'mosaic' || s.type === 'circle' || s.type === 'image') {
      s.x = o.x + dx; s.y = o.y + dy;
    } else if (s.type === 'magnifier') {
      s.x = o.x + dx; s.y = o.y + dy;
      if (o.tx != null && o.ty != null) {
        s.tx = o.tx + dx; s.ty = o.ty + dy;
      } else {
        s.tx = s.x; s.ty = s.y;
      }
    } else if (s.type === 'stripMagnifier') {
      s.x = o.x + dx; s.y = o.y + dy;
      if (o.tx != null && o.ty != null) {
        s.tx = o.tx + dx; s.ty = o.ty + dy;
      }
    } else if (s.type === 'polygon') {
      s.points = o.points.map(p => ({x: p.x + dx, y: p.y + dy}));
      if (s.regular) {
        s.x = o.x + dx;
        s.y = o.y + dy;
      } else {
        // recompute x,y from points bbox to keep them in sync
        let minX = Infinity, minY = Infinity;
        s.points.forEach(p => { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); });
        s.x = minX;
        s.y = minY;
      }
    } else if (s.type === 'angle') {
      s.x = o.x + dx;
      s.y = o.y + dy;
    } else if (s.type === 'line' || s.type === 'arrow') {
      s.points = o.points.map(p => ({...p, x: p.x + dx, y: p.y + dy}));
    } else if (s.type === 'pen') {
      s.points = o.points.map(p => ({...p, x: p.x + dx, y: p.y + dy}));
    }
  }

  function constrainCornerResize(x, y, w, h, origin, handle) {
    if (['nw','ne','sw','se'].includes(handle)) {
      const ratio = origin.w / origin.h;
      const absW = Math.abs(w);
      const absH = Math.abs(h);
      if (absW / ratio > absH) {
        const signH = h >= 0 ? 1 : -1;
        const newH = absW / ratio * signH;
        if (handle.includes('n')) {
          y = (y + h) - newH;
        }
        h = newH;
      } else {
        const signW = w >= 0 ? 1 : -1;
        const newW = absH * ratio * signW;
        if (handle.includes('w')) {
          x = (x + w) - newW;
        }
        w = newW;
      }
    }
    if (w < 0) { x += w; w = -w; }
    if (h < 0) { y += h; h = -h; }
    return {x, y, w, h};
  }

  function applyResize(s, handle, dx, dy, origin) {
    if ((s.angle || 0) !== 0) return;
    if (s.type === 'rect' || s.type === 'mosaic' || s.type === 'circle' || s.type === 'image') {
      let x = origin.x, y = origin.y, w = origin.w, h = origin.h;
      if (handle.includes('e')) w += dx;
      if (handle.includes('w')) { x += dx; w -= dx; }
      if (handle.includes('s')) h += dy;
      if (handle.includes('n')) { y += dy; h -= dy; }
      const res = constrainCornerResize(x, y, w, h, origin, handle);
      s.x = res.x; s.y = res.y; s.w = res.w; s.h = res.h;
    } else if (s.type === 'magnifier') {
      if (handle === 'anchor') {
        s.tx = origin.tx + dx; s.ty = origin.ty + dy;
      } else {
        const delta = handle === 'e' ? dx : handle === 'w' ? -dx : handle === 's' ? dy : -dy;
        s.r = Math.max(10, origin.r + delta);
      }
    } else if (s.type === 'stripMagnifier') {
      if (handle === 'anchor') {
        s.tx = origin.tx + dx; s.ty = origin.ty + dy;
      } else if (handle === 'bodyAnchor') {
        s.x = origin.x + dx; s.y = origin.y + dy;
      } else if (handle.startsWith('src-')) {
        // Resize source rect -> magnifier body follows proportionally, zoom stays constant
        const zoom = origin.zoom || 2;
        let tw = origin.w / zoom;
        let th = origin.h / zoom;
        let tLeft = origin.tx - tw / 2;
        let tRight = origin.tx + tw / 2;
        let tTop = origin.ty - th / 2;
        let tBottom = origin.ty + th / 2;
        if (handle.includes('e')) tRight += dx;
        if (handle.includes('w')) tLeft += dx;
        if (handle.includes('s')) tBottom += dy;
        if (handle.includes('n')) tTop += dy;
        const newTw = Math.max(4, tRight - tLeft);
        const newTh = Math.max(4, tBottom - tTop);
        const newTx = tLeft + newTw / 2;
        const newTy = tTop + newTh / 2;
        const gapX = origin.tx - (origin.x + origin.w / 2);
        const gapY = origin.ty - (origin.y + origin.h / 2);
        s.tx = newTx;
        s.ty = newTy;
        s.w = newTw * zoom;
        s.h = newTh * zoom;
        s.x = s.tx - gapX - s.w / 2;
        s.y = s.ty - gapY - s.h / 2;
      } else {
        // Resize magnifier body -> source rect follows proportionally, zoom stays constant
        let x = origin.x, y = origin.y, w = origin.w, h = origin.h;
        if (handle.includes('e')) w += dx;
        if (handle.includes('w')) { x += dx; w -= dx; }
        if (handle.includes('s')) h += dy;
        if (handle.includes('n')) { y += dy; h -= dy; }
        const res = constrainCornerResize(x, y, w, h, origin, handle);
        x = res.x; y = res.y; w = Math.max(10, res.w); h = Math.max(10, res.h);
        const gapX = origin.tx - (origin.x + origin.w / 2);
        const gapY = origin.ty - (origin.y + origin.h / 2);
        s.x = x; s.y = y; s.w = w; s.h = h;
        s.tx = s.x + s.w / 2 + gapX;
        s.ty = s.y + s.h / 2 + gapY;
      }
    } else if (s.type === 'polygon') {
      if (s.regular) {
        let x = origin.x, y = origin.y, w = origin.w, h = origin.h;
        if (handle.includes('e')) w += dx;
        if (handle.includes('w')) { x += dx; w -= dx; }
        if (handle.includes('s')) h += dy;
        if (handle.includes('n')) { y += dy; h -= dy; }
        const res = constrainCornerResize(x, y, w, h, origin, handle);
        s.x = res.x; s.y = res.y; s.w = res.w; s.h = res.h;
        const cx = s.x + s.w/2;
        const cy = s.y + s.h/2;
        s.points = generateRegularPolygonPoints(cx, cy, s.w, s.h, s.sides);
      } else {
        const ptMatch = handle.match(/^pt-(\d+)$/);
        if (ptMatch) {
          const idx = parseInt(ptMatch[1], 10);
          if (origin.points && origin.points[idx]) {
            s.points[idx] = { x: origin.points[idx].x + dx, y: origin.points[idx].y + dy };
          }
        }
      }
    } else if (s.type === 'angle') {
      if (handle === 'pt-0') {
        const lx = origin.r1 * Math.cos(origin.a1) + dx;
        const ly = origin.r1 * Math.sin(origin.a1) + dy;
        s.r1 = Math.max(5, Math.hypot(lx, ly));
        s.a1 = Math.atan2(ly, lx);
      } else if (handle === 'pt-1') {
        const lx = origin.r2 * Math.cos(origin.a2) + dx;
        const ly = origin.r2 * Math.sin(origin.a2) + dy;
        s.r2 = Math.max(5, Math.hypot(lx, ly));
        s.a2 = Math.atan2(ly, lx);
      }
    } else if ((s.type === 'line' || s.type === 'arrow')) {
      const ptMatch = handle.match(/^pt-(\d+)$/);
      if (ptMatch) {
        const idx = parseInt(ptMatch[1], 10);
        if (origin.points && origin.points[idx]) {
          s.points[idx] = { ...origin.points[idx], x: origin.points[idx].x + dx, y: origin.points[idx].y + dy };
        }
      }
    }
  }

  function applyRotate(s, wx, wy, origin) {
    const c = shapeCenter(origin);
    const startAngle = Math.atan2(state.dragStart.y - c.y, state.dragStart.x - c.x);
    const currentAngle = Math.atan2(wy - c.y, wx - c.x);
    s.angle = (origin.angle || 0) + (currentAngle - startAngle);
  }

  function handleCursor(name) {
    const base = name.startsWith('src-') ? name.slice(4) : name;
    if (base === 'nw' || base === 'se') return 'nwse-resize';
    if (base === 'ne' || base === 'sw') return 'nesw-resize';
    if (base === 'n' || base === 's') return 'ns-resize';
    if (base === 'e' || base === 'w') return 'ew-resize';
    if (/^pt-\d+$/.test(base)) return 'crosshair';
    if (base === 'rot') return 'grab';
    if (base === 'anchor' || base === 'bodyAnchor') return 'move';
    return 'default';
  }

  function updateCursor() {
    if (state.isPanning || state.isRotating) {
      canvas.style.cursor = 'grabbing';
    } else if (state.tool === 'select') {
      canvas.style.cursor = state.spaceDown ? 'grab' : 'default';
    } else if (state.tool === 'picker') {
      canvas.style.cursor = 'crosshair';
    } else {
      canvas.style.cursor = 'crosshair';
    }
  }

  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);

  canvas.addEventListener('mouseleave', () => {
    hidePickerPreview();
    if (state.isDrawing && state.tempShape) {
      state.isDrawing = false;
      finalizeTempShape();
      updateCursor();
    }
    if (state.isDragging) {
      state.isDragging = false;
      state.dragOrigin = null;
      updateCursor();
    }
    if (state.isResizing) {
      state.isResizing = false;
      state.resizeHandle = null;
      state.dragOrigin = null;
      updateCursor();
    }
    if (state.isRotating) {
      state.isRotating = false;
      state.dragOrigin = null;
      updateCursor();
    }
  });

  // Prevent context menu on canvas (right click)
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  // ===== Picker preview helpers =====
  function updatePickerPreview(mx, my) {
    pickerPreview.style.display = 'block';
    pickerPreview.style.left = (mx + 16) + 'px';
    pickerPreview.style.top = (my - 96) + 'px';

    const srcSize = 9;
    const half = Math.floor(srcSize / 2);
    const sx = Math.max(0, Math.min(canvas.width - srcSize, Math.floor(mx) - half));
    const sy = Math.max(0, Math.min(canvas.height - srcSize, Math.floor(my) - half));

    const data = ctx.getImageData(sx, sy, srcSize, srcSize);
    if (!pickerTempCanvas) {
      pickerTempCanvas = document.createElement('canvas');
      pickerTempCanvas.width = srcSize;
      pickerTempCanvas.height = srcSize;
    }
    pickerTempCanvas.getContext('2d').putImageData(data, 0, 0);
    pickerCtx.clearRect(0, 0, 80, 80);
    pickerCtx.imageSmoothingEnabled = false;
    pickerCtx.drawImage(pickerTempCanvas, 0, 0, 80, 80);
  }

  function hidePickerPreview() {
    pickerPreview.style.display = 'none';
  }

  function lerpPoint(a, b, t) {
    return {x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t};
  }
  function quadBezierPoint(p0, p1, p2, t) {
    const mt = 1 - t;
    return {
      x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
      y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y
    };
  }

  // Double click text to edit or add line curve control point
  canvas.addEventListener('dblclick', e => {
    if (!state.bgImage || state.tool !== 'select') return;
    const pos = screenToWorld(e.offsetX, e.offsetY);
    const s = hitShape(pos);
    if (s && s.type === 'text') {
      state.selectedId = s.id;
      updateSelectionUI();
      draw();
      startTextEdit(s);
      return;
    }
    if (s && (s.type === 'line' || s.type === 'arrow')) {
      state.selectedId = s.id;
      updateSelectionUI();
      draw();
      const pts = ensureLinePoints(s);
      let bestSeg = -1;
      let bestT = 0.5;
      let bestDist = Infinity;
      let isCurved = false;

      for (let i = 0; i < pts.length - 1; i++) {
        if (pts[i + 1].cp && i + 2 < pts.length) {
          // Curved segment: sample to find closest t
          const p0 = pts[i], p1 = pts[i + 1], p2 = pts[i + 2];
          for (let k = 0; k <= 20; k++) {
            const t = k / 20;
            const pt = quadBezierPoint(p0, p1, p2, t);
            const d = Math.hypot(pos.x - pt.x, pos.y - pt.y);
            if (d < bestDist) {
              bestDist = d;
              bestSeg = i;
              bestT = Math.max(0.05, Math.min(0.95, t));
              isCurved = true;
            }
          }
          i += 1; // advance past control point so next starts at endpoint
        } else {
          // Straight segment
          const a = pts[i], b = pts[i + 1];
          const abx = b.x - a.x, aby = b.y - a.y;
          const len2 = abx * abx + aby * aby;
          let t = len2 === 0 ? 0 : ((pos.x - a.x) * abx + (pos.y - a.y) * aby) / len2;
          t = Math.max(0, Math.min(1, t));
          const proj = {x: a.x + t * abx, y: a.y + t * aby};
          const d = Math.hypot(pos.x - proj.x, pos.y - proj.y);
          if (d < bestDist) {
            bestDist = d;
            bestSeg = i;
            bestT = t;
            isCurved = false;
          }
        }
      }

      const threshold = Math.max(s.width + 8, 12);
      if (bestSeg >= 0 && bestDist <= threshold) {
        recordState();
        if (isCurved) {
          const p0 = pts[bestSeg];
          const p1 = pts[bestSeg + 1];
          const p2 = pts[bestSeg + 2];
          const q0 = lerpPoint(p0, p1, bestT);
          const q1 = lerpPoint(p1, p2, bestT);
          const r0 = lerpPoint(q0, q1, bestT);
          pts.splice(bestSeg, 3,
            p0,
            {x: q0.x, y: q0.y, cp: true},
            {x: r0.x, y: r0.y},
            {x: q1.x, y: q1.y, cp: true},
            p2
          );
        } else {
          const a = pts[bestSeg];
          const b = pts[bestSeg + 1];
          const dx = b.x - a.x, dy = b.y - a.y;
          const segLen = Math.hypot(dx, dy);
          const perp = segLen === 0 ? {x: 0, y: 0} : {x: -dy / segLen, y: dx / segLen};
          const side = Math.sign(dx * (pos.y - a.y) - dy * (pos.x - a.x));
          const proj = {x: a.x + bestT * dx, y: a.y + bestT * dy};
          const distToSeg = Math.hypot(pos.x - proj.x, pos.y - proj.y);
          let cp;
          if (distToSeg < 4) {
            const offset = Math.min(segLen * 0.3, Math.max(20, segLen * 0.15));
            cp = {x: proj.x + perp.x * offset * side, y: proj.y + perp.y * offset * side, cp: true};
          } else {
            cp = {x: pos.x, y: pos.y, cp: true};
          }
          pts.splice(bestSeg + 1, 0, cp);
        }
        draw();
      }
    }
  });

  // ===== Text editing overlay =====
  function startTextEdit(s) {
    let scr;
    if (s.angle) {
      const b = shapeLocalBBox(s, ctx);
      const p = toWorld(s, -b.w/2, -b.h/2);
      scr = worldToScreen(p.x, p.y);
    } else {
      scr = worldToScreen(s.x, s.y);
    }
    textOverlay.style.display = 'block';
    textOverlay.style.left = scr.x + 'px';
    textOverlay.style.top = scr.y + 'px';
    textEditor.value = s.text;
    textEditor.focus();
    textEditor.select();
    autoResizeTextarea();

    function onConfirm() {
      cleanup();
      if (s.text !== textEditor.value) {
        recordState();
        s.text = textEditor.value;
        updateSelectionUI();
        draw();
      }
    }
    function onCancel() {
      cleanup();
    }
    function cleanup() {
      textOverlay.style.display = 'none';
      textEditor.removeEventListener('keydown', onKey);
      textEditor.removeEventListener('input', autoResizeTextarea);
      textEditor.removeEventListener('blur', onConfirm);
    }
    function onKey(ev) {
      if (ev.key === 'Enter' && !ev.shiftKey) {
        ev.preventDefault();
        onConfirm();
      } else if (ev.key === 'Escape') {
        ev.preventDefault();
        onCancel();
      }
    }
    textEditor.addEventListener('keydown', onKey);
    textEditor.addEventListener('input', autoResizeTextarea);
    textEditor.addEventListener('blur', onConfirm, {once:true});
  }

  function autoResizeTextarea() {
    textEditor.style.height = 'auto';
    textEditor.style.height = textEditor.scrollHeight + 'px';
  }

  function duplicateShape(s) {
    const clone = JSON.parse(JSON.stringify(s));
    clone.id = uid();
    const dx = 10;
    const dy = 10;
    if (clone.type === 'text' || clone.type === 'rect' || clone.type === 'mosaic' || clone.type === 'circle' || clone.type === 'image') {
      clone.x += dx; clone.y += dy;
    } else if (clone.type === 'magnifier') {
      clone.x += dx; clone.y += dy;
      if (clone.tx != null) clone.tx += dx;
      if (clone.ty != null) clone.ty += dy;
    } else if (clone.type === 'stripMagnifier') {
      clone.x += dx; clone.y += dy;
      if (clone.tx != null) clone.tx += dx;
      if (clone.ty != null) clone.ty += dy;
    } else if (clone.type === 'polygon') {
      if (clone.points) clone.points = clone.points.map(p => ({x: p.x + dx, y: p.y + dy}));
      if (clone.regular) {
        clone.x += dx; clone.y += dy;
      } else {
        let minX = Infinity, minY = Infinity;
        clone.points.forEach(p => { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); });
        clone.x = minX; clone.y = minY;
      }
    } else if (clone.type === 'angle') {
      clone.x += dx; clone.y += dy;
    } else if (clone.type === 'line' || clone.type === 'arrow' || clone.type === 'pen') {
      if (clone.points) clone.points = clone.points.map(p => ({...p, x: p.x + dx, y: p.y + dy}));
    }
    return clone;
  }

  function duplicateSelected() {
    if (!state.selectedIds.length) return;
    recordState();
    const newIds = [];
    // Process in reverse order so splicing maintains correct positions
    const toCopy = state.selectedIds.slice().reverse();
    toCopy.forEach(id => {
      const s = state.shapes.find(x => x.id === id);
      if (!s) return;
      const clone = duplicateShape(s);
      const idx = state.shapes.findIndex(x => x.id === s.id);
      state.shapes.splice(idx + 1, 0, clone);
      newIds.push(clone.id);
    });
    state.selectedIds = newIds.reverse();
    state.selectedId = state.selectedIds[0] || null;
    updateSelectionUI();
    renderLayerList();
    clearMosaicCaches();
    draw();
  }

  // ===== Keyboard shortcuts =====
  window.addEventListener('keydown', e => {
    if (e.code === 'Space') {
      state.spaceDown = true;
      if (state.tool === 'select') canvas.style.cursor = 'grab';
      return;
    }
    // Ignore shortcuts when typing in input/textarea
    if (/^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName)) return;

    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) redo(); else undo();
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      redo();
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      duplicateSelected();
      return;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      const s = getSelected();
      if (s && (s.type === 'line' || s.type === 'arrow') && state.draggedHandle && /^pt-\d+$/.test(state.draggedHandle)) {
        const pts = ensureLinePoints(s);
        const idx = parseInt(state.draggedHandle.replace('pt-', ''), 10);
        if (pts.length <= 2 && !pts.some(p => p.cp)) {
          deleteSelected();
          return;
        }
        recordState();
        if (pts[idx] && pts[idx].cp) {
          pts.splice(idx, 1);
        } else {
          let count = 1;
          if (pts[idx + 1] && pts[idx + 1].cp) count++;
          pts.splice(idx, count);
          if (pts[0] && pts[0].cp) pts.shift();
          if (pts[pts.length - 1] && pts[pts.length - 1].cp) pts.pop();
          if (pts.length < 2) {
            deleteSelected();
            draw();
            return;
          }
        }
        state.draggedHandle = null;
        updateSelectionUI();
        draw();
        return;
      }
      deleteSelected();
      return;
    }
    const toolMap = {
      v:'select', t:'text', r:'rect', c:'circle', o:'polygon', n:'angle', l:'line', a:'arrow', p:'pen', m:'mosaic', g:'magnifier', b:'stripMagnifier', i:'picker'
    };
    const t = toolMap[e.key.toLowerCase()];
    if (t) setTool(t);
  });

  window.addEventListener('keyup', e => {
    if (e.code === 'Space') {
      state.spaceDown = false;
      updateCursor();
    }
  });

  // ===== Init =====
  resizeCanvas();
  updateUndoRedoUI();
  updateSelectionUI();
  draw();
})();
