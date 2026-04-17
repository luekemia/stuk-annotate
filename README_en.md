# Stuk Annotate

A lightweight, zero-dependency, pure front-end image annotation tool.

## Background

I’m a STEM beginner who built this entirely through Vibe Coding. There’s no grand vision—just a simple need: to draw circles, write text, add mosaics, and mark angles on my kid’s homework so explanations are clearer.

![Stuk Annotate interface preview](demo.png)

## Features

- **Open Image / Blank Canvas**: Load JPG / PNG / WebP from local disk, or create a blank white canvas as the base layer.
- **Clipboard Paste**: Paste images directly from the clipboard. They appear as independent objects above the canvas and can be moved, resized, and rotated without overwriting existing annotations.
- **Rich Annotation Tools**:
  - Text (double-click to edit inline)
  - Rectangle, Circle, Polygon (configurable sides and regular polygon mode)
  - Line, Arrow (double-click to add curve control anchors and convert to Bézier curves)
  - Freehand pen
  - Mosaic (adjustable blur intensity)
  - Magnifier (circular and strip variants)
  - Angle marker (auto-calculates and displays the angle value)
- **Layer Management**: The layer panel lists all objects and supports drag-to-reorder; items higher in the list are rendered on top of items lower in the list.
- **Selection Editing**: When an object is selected, the right panel lets you change color, stroke width, font size, fill, dash style, rotation, and more.
- **Undo / Redo**: Full history support for all operations.
- **Project Save / Open**: Save the current canvas and all annotations as a `.stukproj` file. When reopened, every annotation remains an independent object that can still be moved, resized, rotated, or edited—something many similar tools (which only export static images) cannot do. Supports overwrite or save-as.
- **Marquee Selection & Multi-Selection Batch Operations**: Drag on an empty area to draw a marquee box; all annotations inside are selected in bulk. You can then change color, stroke width, font size, fill, dash style, zoom, mosaic blur, polygon sides / regular mode, angle / font size, etc. for all selected items at once, or drag, duplicate, and delete them as a group.
- **Duplicate Annotation**: Press `Cmd+C` (or `Ctrl+C`) to duplicate the selected annotation(s).
- **Proportional Corner Resize**: Dragging any of the four corner handles now scales the shape proportionally.
- **Pixel-Level Nudge**: Use the arrow keys `↑ ↓ ← →` to nudge selected shape(s) by one screen pixel per press. Hold `Shift` to nudge by 10 pixels.
- **Native File Overwrite & Path Memory**: On browsers that support the File System Access API (Chrome/Edge), opened projects remember their original file path. Overwrite saves directly back to the original file, and Save As defaults to the same folder. Falls back to legacy download behavior on unsupported browsers.
- **Export & Copy**: One-click export to PNG or copy to clipboard.

## Quick Start

**Live Demo:** https://luekemia.github.io/stuk-annotate/

No installation required—just open `index.html` in a modern browser.

```bash
# Optionally serve locally with Python
python3 -m http.server 8080
# Then visit http://localhost:8080
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `V` | Select tool |
| `T` | Text tool |
| `R` | Rectangle tool |
| `C` | Circle tool |
| `O` | Polygon tool |
| `N` | Angle tool |
| `L` | Line tool |
| `A` | Arrow tool |
| `P` | Pen tool |
| `M` | Mosaic tool |
| `G` | Circular magnifier |
| `B` | Strip magnifier |
| `I` | Color picker |
| `Ctrl + Z` | Undo |
| `Ctrl + Y` | Redo |
| `Cmd / Ctrl + C` | Duplicate selected object(s) |
| `Del` | Delete selected object |
| `↑ ↓ ← →` | Nudge selected object(s) by 1 pixel |
| `Shift + Arrow keys` | Nudge by 10 pixels |
| `Scroll wheel` | Zoom canvas |
| `Middle click / Space + drag` | Pan canvas |

## Tech Stack

- Pure HTML5 + CSS3 + JavaScript (ES6+), zero third-party dependencies.
- All rendering and interaction built on HTML5 Canvas 2D.
- Everything stays local—no images or annotations are uploaded anywhere.

## License

MIT License — use, modify, and distribute freely.
