# NVLP Documentation Site

Static documentation site for the NVLP (Virtual Envelope Budget App) project.

## What This Does

This site automatically builds and serves:
- **API Documentation** - Your OpenAPI specification formatted with Redoc
- **Data Dictionary** - Your markdown documentation formatted as HTML
- **Homepage** - Navigation between both docs

## Local Development

Test the site locally:

```bash
npm run build
npm run dev
```

This will:
1. Build static HTML files from your OpenAPI spec and markdown
2. Start a local server at http://localhost:3000

## Deployment

Deploy to Vercel:

```bash
vercel --prod
```

The site will be available at your Vercel domain. You can set up a custom domain like `docs.nvlp.app` in your Vercel dashboard.

## Files Generated

- `public/index.html` - Documentation homepage
- `public/api-docs.html` - OpenAPI specification (formatted with Redoc)
- `public/data-dictionary.html` - Markdown documentation (formatted as HTML)

## Source Files

The build script looks for:
- `../docs/api-specification.yaml` - Your OpenAPI spec
- `../docs/data-dictionary.md` - Your markdown documentation

Make sure these files exist in the parent `docs/` directory before building.