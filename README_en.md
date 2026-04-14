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
- **Export & Copy**: One-click export to PNG or copy to clipboard.

## Quick Start

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
| `Del` | Delete selected object |
| `Scroll wheel` | Zoom canvas |
| `Middle click / Space + drag` | Pan canvas |

## Tech Stack

- Pure HTML5 + CSS3 + JavaScript (ES6+), zero third-party dependencies.
- All rendering and interaction built on HTML5 Canvas 2D.
- Everything stays local—no images or annotations are uploaded anywhere.

## License

MIT License — use, modify, and distribute freely.
