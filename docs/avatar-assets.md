# Banana Rooftops avatar assets

The full-body transparent PNG assets in `web/public/avatars/` were generated using the built-in imagegen tool from the user's family photograph. The source photograph is not bundled or committed. The generated characters are game illustrations, not stock portraits or generic placeholder figures.

- `jordi.png`: Jordi, the adult man on the left, with a dark baseball cap, round wire-frame glasses, short salt-and-pepper beard with a grey chin, black T-shirt, and small necklace.
- `anna.png`: Anna, the woman on the right, with long wavy light-brown hair, golden highlights, a softly rounded smiling face, and teal top.
- `guim.png`: Guim, updated from the newer individual photograph, with tousled light-brown hair, a slimmer youthful face, royal-blue T-shirt, charcoal/olive shorts, colourful graffiti-pattern backpack, navy/white/yellow trainers and a raised open hand.

The generated images have real alpha transparency. They are rendered as textured character cutouts in the three.js scene, with animated bounce, throwing lean and victory dance. The city, banana, arc, particles, lighting and destructible building blocks are actual 3D geometry. This gives a readable side-on duel with depth while keeping the supplied faces recognisable. The avatar cutouts are not rigged 3D models.

## Final prompt set

Tool: built-in `image_gen.imagegen`, `transparent_background: true`.

All prompts specify stylized-concept production game cutouts, one full-body character per asset, no scenery, no text, no watermark, clear transparent margins, relaxed standing stance, slightly separated arms and visible shoes. The family photo is the identity reference for Jordi and Anna. Anna also uses the generated Jordi as a style reference. Guim now uses the newer individual photograph as his identity reference and the previous cutout as a style reference.

### Jordi

Create only Jordi, the adult man on the left of the reference. Preserve his broad smiling face, fair warm skin, round black wire-frame glasses, brown eyes, short salt-and-pepper beard with a prominently grey chin, dark curved-brim baseball cap, black short-sleeve T-shirt, cord necklace and pendant. Extend to charcoal trousers and casual trainers. Use a friendly expressive modern 3D cartoon caricature with oversized head, rounded forms, soft sculpted materials, warm studio lighting and a mischievous confident smile. Full-body, centred, nearly front-facing with a subtle three-quarter turn. Preserve the specific man's likeness, with real alpha transparency.

### Anna

Create only Anna, the woman on the right of the family photo. Match the generated Jordi's friendly oversized-head 3D caricature style. Preserve her fair warm skin, softly rounded smiling face and eyes, long wavy light-brown hair with subtle golden highlights and side part, and teal top. Add dark blue trousers and neutral trainers. Friendly rounded animated-film game character with soft materials and warm playful expression, standing full-body nearly front-facing. Keep her specific likeness, not a generic character. Transparent cutout with no background or text.

### Guim — updated individual photo

Tool: built-in imagegen, genuine transparent background. The newer individual photograph is the authoritative identity, age, face, hair, clothing and accessory reference. The previous cutout is used only for the shared oversized-head 3D cartoon style and full-body framing.

Create Guim with a slimmer youthful face, warm fair skin, brown eyes, softly defined eyebrows, a small straight nose and gentle closed-mouth smile. Preserve his tousled light-brown hair with short sides and a longer wavy top swept aside. Use the new photo's royal-blue T-shirt with white abstract sporty graphic, charcoal/olive shorts, white ankle socks, navy trainers with white soles and yellow accents, and blue/cyan/purple/magenta graffiti-pattern backpack with black shoulder straps. Pose him nearly front-facing, slightly three-quarter, with one open hand raised around chest height like the new photo and the other arm relaxed. Match the game's friendly rounded 3D caricature style while keeping him recognisable as the specific boy in the newer photograph. Include his entire body, shoes and backpack with transparent margins; no scenery, ground plane, fence, street, background glow, text or watermark.
