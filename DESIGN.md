# Design System Document: The Sacred Resonance

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Sacred Resonance."** 

This is not a utility app; it is a digital artifact for the practitioner. It draws inspiration from the intersection of biology, mathematics, and industrial sound. We are moving away from the "flatness" of modern web standards toward a "Sacred Anatomy" aesthetic—UI that feels like it has been unearthed rather than coded.

To break the "template" look, we utilize:
*   **Intentional Asymmetry:** Avoid centering every element. Use the spacing scale to create rhythmic, off-balance layouts that guide the eye through tension.
*   **Overlapping Elements:** Typography should occasionally bleed over container edges or background textures to create a sense of three-dimensional depth.
*   **Anatomical Tactility:** Elements should feel like they have weight, skin, and a pulse, achieved through subtle glows and organic gradients.

---

## 2. Colors: Tonal Depth & Atmospheric Mystery
Our palette is rooted in the void (`#131313`). We use earthy, visceral tones to represent the human element against the dark, industrial background.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders for sectioning or containment. 
Boundary definition must be achieved solely through:
1.  **Background Color Shifts:** Use `surface-container-low` against a `surface` background to define a zone.
2.  **Tonal Transitions:** Use soft gradients to fade one section into another.
3.  **Negative Space:** Use the Spacing Scale (specifically `8`, `10`, or `12`) to create mental dividers.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. Hierarchy is defined by "nesting" rather than lines:
*   **Foundation:** `surface` (#131313).
*   **Intermediate:** `surface-container-low` for secondary groupings.
*   **Prominent:** `surface-container-highest` for active interactive cards.
By nesting a `surface-container-lowest` card inside a `surface-container` section, you create a natural "carved out" look that feels premium and intentional.

### The "Glass & Gradient" Rule
To escape the "flat box" look, use Glassmorphism for floating elements (like practice timers or navigation overlays). Use `surface` colors at 60-80% opacity with a `backdrop-blur` of 12px-20px. 

### Signature Textures
Apply subtle linear gradients (e.g., `primary-container` to `primary`) on interactive components. This mimics the sheen of a guitar string or the glow of a vacuum tube, providing the "visual soul" flat colors lack.

---

## 3. Typography: The Industrial Gothic
We pair **Space Grotesk** (Headlines) with **Manrope** (Body) to balance technical precision with human readability.

*   **Display & Headlines (Space Grotesk):** These should feel monolithic. Use `display-lg` for session milestones and `headline-md` for practice categories. The industrial nature of Space Grotesk provides the "Gothic" edge without sacrificing modernism.
*   **Body & Titles (Manrope):** Manrope’s geometric but warm curves provide the "Anatomical" contrast. Use `body-md` for logs and `title-sm` for metadata.
*   **Hierarchy Note:** Use wide letter-spacing (tracking) on `label-sm` to create an editorial, "technical manual" feel.

---

## 4. Elevation & Depth: Tonal Layering
Traditional drop shadows are forbidden. We achieve "lift" through light and atmosphere.

*   **The Layering Principle:** Stack `surface-container` tiers. A `surface-container-high` element sitting on a `surface-dim` background creates a soft, natural lift.
*   **Ambient Shadows:** If a floating effect is required, use a shadow with a blur radius of 30px-60px and an opacity of 6%. The shadow color must be a tinted version of `primary` or `on-surface`, never pure black. This simulates "ambient occlusion" rather than a cheap digital shadow.
*   **The "Ghost Border" Fallback:** For input containment, use the `outline-variant` token at **15% opacity**. This creates a "suggestion" of a boundary that only appears upon closer inspection.
*   **Anatomical Glow:** Interactive elements in a "Pressed" or "Active" state should emit a soft glow using the `surface-tint` or `tertiary` color, suggesting energy flowing through the component.

---

## 5. Components

### Buttons (The "Actuators")
*   **Primary:** A gradient from `primary_container` to `primary`. Use `rounded-sm` for a slightly sharp, industrial feel. Add a 2px inner-shadow to give it a tactile, "depressed" look.
*   **Secondary:** Ghost-style buttons using `outline-variant` at 20% opacity. On hover, the opacity increases.
*   **State:** Use `tertiary` (Muted Gold) for active/success states to symbolize "enlightenment" or "completion."

### Progress Fibers (Custom Component)
Replacing standard progress bars. Use organic, tapering lines that look like guitar strings or muscle fibers. As the practice goal is reached, the "fiber" glows from `primary` to `tertiary`.

### Practice Cards
*   **Constraint:** No borders. Use `surface-container-low`.
*   **Layout:** Use asymmetrical padding. Place the date in a vertical `label-sm` orientation on the left edge.
*   **Content:** Use `title-lg` for the song name and `body-sm` for the BPM or technical notes.

### Input Fields
*   **Styling:** No background color. Only a bottom "Ghost Border" (10% opacity `outline`). 
*   **Focus State:** The border transitions to 100% opacity `primary` with a subtle `primary_container` glow beneath the text.

### Lists & Feeds
*   **Rule:** Forbid divider lines. 
*   **Separation:** Use a vertical gap of `spacing.5` or `spacing.6`. Use alternating `surface` and `surface-container-lowest` backgrounds for long-form practice logs to create a rhythmic, striped "mantra" effect.

---

## 6. Do's and Don'ts

### Do:
*   **Embrace the Void:** Let large areas of `#131313` breathe. It creates the "atmospheric" mystery requested.
*   **Use Sacred Geometry:** Incorporate subtle SVG patterns of mandalas or geometric spirals in the background of `surface-container` elements at 3-5% opacity.
*   **Layer Textures:** Use a subtle "grain" or "noise" overlay (2% opacity) over the entire UI to give it a filmic, analog quality.

### Don't:
*   **Don't use "Blue":** Unless it is a system-level error, stick strictly to the earthy burnt oranges, golds, and deep reds.
*   **Don't use Perfect Circles:** For "Full" roundedness, prefer `rounded-xl` for a more "squircle" or organic feel where possible, unless it's a specific geometric icon.
*   **Don't Over-illuminate:** The UI should feel like it's in a dimly lit room. High-contrast white text should be reserved only for the most critical headlines. Use `on-surface-variant` for secondary text to keep the "dark" atmosphere.

### Accessibility Note
While the theme is dark and atmospheric, ensure that all `on-surface` text on `surface` backgrounds maintains a contrast ratio of at least 4.5:1. Use the `tertiary` (Gold) color for critical call-to-actions to ensure they cut through the atmospheric haze.