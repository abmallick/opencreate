# Creative Composer

A lightweight Vue app for marketing teams to blend a product into a scene and optionally spin up a short video.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Add your OpenAI API key:

```bash
cp .env.example .env
```

3. Run the app + API server:

```bash
npm run dev:full
```

- Frontend: http://localhost:5173
- API server: http://localhost:8787

## Notes

- The image generator uses the Images Edits API with two input images.
- Video generation uses Sora with the generated image as the starting reference.
- Ensure you have access to Sora on your OpenAI account.
