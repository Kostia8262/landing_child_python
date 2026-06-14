How to add "skills" (скилы) to this static landing

This site is a static HTML/CSS/JS landing. There are two simple ways to surface "skills" (learning outcomes) in this version:

1) Quick — edit the HTML directly
   - Open `index.html` and find the `python-course-grid` section.
   - Add/remove `.python-feature` blocks. Each block has this structure:

     <div class="python-feature">
       <div class="python-feature-icon">🎮</div>
       <div class="feature-text">
         <h4>Skill title</h4>
         <p>Short description (1–2 lines)</p>
       </div>
     </div>

   - Keep icons small and descriptive (emoji are used here for simplicity).
   - For translations, add `data-ru` attributes on headings and paragraphs.

2) Slightly advanced — make it data-driven
   - Create a JSON file (e.g. `data/skills.json`) with an array of skills, each having `icon`, `title_ua`, `title_ru`, `desc_ua`, `desc_ru`.
   - In `js/main.js` add a small renderer function that fetches `data/skills.json` and builds the `.python-course-grid` innerHTML using the same markup as above.
   - This allows non-developers to edit `data/skills.json` without touching HTML.

Example `data/skills.json` entry:
[
  {
    "icon": "🎮",
    "title_ua": "Pygame — розробка ігор",
    "title_ru": "Pygame — разработка игр",
    "desc_ua": "Створення 2D ігор: рух, колізії, звуки.",
    "desc_ru": "Создание 2D игр: движение, коллизии, звуки."
  }
]

If you want, I can implement the data-driven renderer (adds 20–40 lines in `js/main.js` and one JSON file). Tell me if you prefer editing HTML or having a JSON-driven approach.
