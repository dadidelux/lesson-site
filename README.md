# How to Use LLMs

A static, editorial-style learning site for a 23-lesson course based on Andrej Karpathy's segmented talk.

## Structure

- `index.html` — course overview, progress, chapters, and glossary
- `lesson.html?id=...` — lesson reader and quiz mount
- `content/lessons.json` — course content data
- `content/quizzes.json` — quiz data
- `assets/` — styles, scripts, and lesson media

## Run locally

From this directory, start any static file server, for example:

```sh
python -m http.server 8000
```

Open `http://localhost:8000`. The site fetches its JSON files, so opening HTML directly with `file://` will not work.

## Deploy

Deploy this directory as a static project on Vercel. No build command is needed; `vercel.json` enables clean URLs.
