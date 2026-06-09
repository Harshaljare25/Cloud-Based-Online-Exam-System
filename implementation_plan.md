# Implementation Plan - Nordic Minimalist Theme (Zero Distraction)

We will redesign the Online Exam Platform interface to follow the **Nordic Minimalist (Zero Distraction)** design theme, changing it from a neon dark theme to a premium enterprise-grade light theme.

## User Review Required

> [!NOTE]
> The theme changes the site from a dark neon mode to a light, clean, minimalist mode. All visual elements, including inputs, cards, borders, buttons, chart bars, and the SVG gauge will be updated to align with the new palette.

### Proposed Color Palette:
- **Primary (Brand & Headers)**: `#1E2530` (Deep Midnight Onyx) – Used for headers, navbar background, and primary text structure.
- **Secondary Accent**: `#B39256` (Muted Champagne Gold) – Used sparingly for active states, indicators, gold highlights, and milestones.
- **Background (Canvas)**: `#F4F5F7` (Soft Platinum) – Clean light backdrop.
- **Surface Layout (Cards)**: `#FFFFFF` (Pure White) with soft, diffused shadows.
- **Text/Typography**: `#2C3E50` (Slate Charcoal) – Refined, high-readability text.

---

## Proposed Changes

### Frontend Styles

#### [MODIFY] [style.css](file:///c:/Users/Harshal/OneDrive/Desktop/Online%20Exam/frontend/css/style.css)
- **CSS Variables**: Re-define `:root` variables to support light mode, replacing deep dark backgrounds and neon gradients with soft platinum canvas, pure white surfaces, deep onyx brand headers, slate charcoal text, and muted gold highlights.
- **Global / Body Style**: Set background-color to `--bg-canvas` and remove neon radial gradients. Adjust scrollbar styling to fit the light background.
- **Glass Panel (Cards)**: Simplify `.glass-panel` style to represent a clean, pure white card surface layout with subtle border and premium diffused shadows (no blur or glass glow).
- **App Navbar**: Set background to `#1E2530` (Deep Midnight Onyx) with white text. Update branding logo to display the brand name with a `#B39256` (Muted Gold) dot indicator.
- **Buttons**:
  - Update `.btn-primary` to use `#1E2530` (Midnight Onyx) with white text, transitioning to slightly lighter onyx or gold border on hover.
  - Update `.btn-secondary` to use soft grey/platinum background with `#2C3E50` text.
  - Update secondary action colors and text.
- **Form Controls**: Update `.form-input` and `.form-select` to have pure white backgrounds, charcoal borders, and golden outlines upon focus.
- **Exam Options**:
  - Update option button layout to look minimal.
  - Update `.option-btn.selected` to highlight with soft champagne gold background and border, with gold option badge.
- **Question Navigator**:
  - Update question grids to use clean minimalist grey-borders.
  - Set active cell to gold border and light gold background.
  - Set answered cell to deep onyx (`#1E2530`) background or muted success color.
- **Result screen**:
  - Ensure the gauge-svg uses gold accent fills.
  - Adjust score badges and review blocks to look clean on white surfaces.
- **Analytics Chart**:
  - Redesign chart bars to use Midnight Onyx (`#1E2530`) with gold accents on hover, instead of the neon blue glow.
- **Tables**: Update table formatting to look premium with clean light borders and clean row hover states.

#### [MODIFY] [index.html](file:///c:/Users/Harshal/OneDrive/Desktop/Online%20Exam/frontend/index.html)
- **SVG Gauge Gradient**: Update the linear gradient inside `svg` (#gauge-gradient) to fade between `#B39256` (Muted Gold) and `#D4AF37` or `#8C6D34` to match the secondary accent.

---

## Verification Plan

### Manual Verification
1. Serve the frontend folder using a local web server (e.g. `python -m http.server 8000`).
2. Use browser subagent to:
   - Load the login page (should show the soft platinum canvas background and clean login card).
   - Log in as a student (`john@exam.com` / `student123`).
   - Confirm student dashboard rendering (clean cards, white surface layouts).
   - Start an exam, check option selection (which should highlight in gold) and the question grid.
   - Complete and submit the exam, verify the results screen (gold percentage gauge and minimalist breakdown).
   - Log out, then log in as an administrator (`admin@exam.com` / `admin123`).
   - Verify the admin metrics, table submissions, and the new onyx-themed chart.
