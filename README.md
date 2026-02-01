# Creative Composer

Creative Composer is a lightweight Vue app for marketing teams to blend a product into a scene. It can also generate a short video from the composed image.

## How to run

```bash
npm install
cp .env.example .env
npm run dev:full
```

- Frontend: http://localhost:5173
- API server: http://localhost:8787

Live Deployment (try it out): http://13.233.36.252:5173/
(Login credentials separately supplied)
## Demo steps

1. Open http://localhost:5173.
2. Upload a product image and a background/scene image.
3. Enter a short prompt describing how to blend the product into the scene.
4. Click "Generate" to create the blended image.
5. (Optional) make changes to the generated image directly
6. Click "Generate Video" and enter a motion prompt to create a short clip.
7. (Optional) directly make changes  to the generated video
