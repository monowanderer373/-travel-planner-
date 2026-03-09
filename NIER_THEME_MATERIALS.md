# Nier Automata theme — materials that would help

The current **Nier Automata** theme only changes **colors** (dark warm background, cream text, teal accents). To match the game's **UI outline, shape, and texture** more closely, the following would help.

---

## Screenshots only — that's enough

You don't need the game folder. **Screenshots are enough.** Name each file by the UI component so we can match them to the site.

**Where to put them:** Create a folder in the project called **`reference/nier-automata-ui`** and save your screenshots there. Name each file by the component, for example:

| Filename | What it is |
|----------|------------|
| `panel-background.png` | Main menu / settings panel background |
| `panel-border.png` | Border/frame around panels |
| `button-default.png` | Default button |
| `button-hover.png` | Button hover state (optional) |
| `section-header.png` | Section titles |
| `input-field.png` | Text input style |
| `sidebar.png` | Sidebar or nav panel |
| `modal.png` | Popup/modal window |
| `card.png` | Card-style block |

You can use slightly different names (e.g. `menu-main.png`, `settings-panel.png`) as long as the filename describes the component. Once the files are in `reference/nier-automata-ui`, tell me the list (or that they're there) and I can update the Nier theme's layout, borders, and textures from the screenshots.

---

## 1. Screenshots (most useful)

- **Menus / pause screen:** Full-screen capture of a menu (e.g. Settings, Inventory, Save/Load) so we can see:
  - Panel shape (rounded corners? sharp? inner border?)
  - How titles and section headers look (font, size, position)
  - Button shape and borders
- **HUD / in-game UI:** If you want HUD-style elements (e.g. bars, small panels), a clear screenshot of that too.

## 2. Textures / assets (if you can extract)

From the game folder you might find:

- **UI textures:** PNG (or similar) used for:
  - Panel backgrounds (noise, grain, subtle pattern)
  - Borders or frames (the "outline" of boxes)
  - Buttons (normal / hover state if separate)
- **Font name:** If the game uses a custom font and you can find its name or file, we can try to use a similar or the same one on the web.

## 3. What to describe (if you can't extract files)

- **Panel style:** Fully flat? Slight gradient? Visible border (thin line, double line, glow)?
- **Corners:** Rounded or sharp? Same on all sides?
- **Effects:** Scan lines, film grain, vignette, or other overlay?
- **Buttons:** Rectangular? Rounded? Any icon or symbol next to text?

## 4. How to share

- **Screenshots:** Add them to the project in **`reference/nier-automata-ui`** and tell me the file names.
- **Textures:** Same — put PNGs (or other image files) in the project and tell me paths and what each is for (e.g. "panel background", "button border").
- **Font:** Tell me the font name; we'll see if we can use it via Google Fonts or a similar service, or suggest a close alternative.

With screenshots and/or textures, we can adjust the Nier theme's **layout, borders, and textures** (e.g. CSS borders, background images, box-shadow) so it feels closer to the game's UI, not just the colors.
