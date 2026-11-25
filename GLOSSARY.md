# Stoa

An interactive 3D library where readers browse a bookcase, pull down classic works of literature, inspect them in their hands, and read them by turning physical-feeling pages.

## Library & Book Structure

**Bookcase**:
The 3D wooden shelving fixture holding the entire collection of volumes.
_Avoid_: Rack, shelf container

**Shelf**:
A single horizontal row of volumes inside the bookcase.

**Volume**:
A single physical book in the library representing a literary work, with its own spine, cover, thickness, and bound leaves.
_Avoid_: Book item, asset, entry

**Placeholder Volume**:
A named classic volume on the bookcase that can be peeked on the shelf (displaying a floating "Coming Soon" label), but cannot be pulled into Inspect Mode or Reading Mode.
_Avoid_: Stub, dummy book, coming-soon item

**Peek**:
The shelf interaction state where a hovered (desktop) or first-tapped (mobile) volume slides slightly forward out of its slot prior to selection.
_Avoid_: Preview, hover state

**Chapter**:
A major structural division within a volume (such as the 24 divisions of *The Odyssey*).
_Avoid_: Book (for subdivisions), part, section

**Leaf**:
A single physical sheet of paper inside a volume, composed of two printable sides (front and back) that bend and turn together.
_Avoid_: Sheet, page mesh

**Page**:
One numbered side of a leaf displaying typeset prose, verse, illustrations, or front matter.
_Avoid_: Slide, screen

**Spread**:
The pair of facing pages (left and right) visible when a volume is held open.
_Avoid_: Double page, view

**Bookmark Ribbon**:
A physical ribbon marker bound to a volume's spine that marks a reader's saved page.

## Scene Modes

**Shelf Mode**:
The browsing state where the camera sits close to the bookcase so the reader can pan across shelves and hover spines to peek at volumes.

**Inspect Mode**:
The examination state where a selected volume has been pulled from the bookcase while still closed, allowing the reader to rotate and inspect its cover, spine, and back before reading or returning it.
_Avoid_: Chosen mode, preview mode

**Reading Mode**:
The active reading state where the inspected volume is opened to a spread, the background bookcase is dimmed, and leaves can be turned.
