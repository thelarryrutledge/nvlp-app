const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const { execSync } = require('child_process');

// Create public directory if it doesn't exist
if (!fs.existsSync('public')) {
  fs.mkdirSync('public');
}

// Build OpenAPI documentation
console.log('Building OpenAPI documentation...');
try {
  execSync('npx @redocly/cli build-docs ../docs/api-specification.yaml --output public/api-docs.html', { stdio: 'inherit' });
  console.log('✅ OpenAPI docs built successfully');
} catch (error) {
  console.error('❌ Error building OpenAPI docs:', error.message);
}

// Build markdown documentation
console.log('Building markdown documentation...');
try {
  const markdownPath = '../docs/data-dictionary.md';
  if (fs.existsSync(markdownPath)) {
    const markdownContent = fs.readFileSync(markdownPath, 'utf8');
    const htmlContent = marked(markdownContent);
    
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NVLP Data Dictionary</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
        }
        h1, h2, h3 { color: #2c3e50; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f8f9fa; }
        code { background-color: #f4f4f4; padding: 2px 4px; border-radius: 3px; }
        pre { background-color: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; }
        .nav { margin-bottom: 20px; }
        .nav a { color: #007bff; text-decoration: none; margin-right: 15px; }
        .nav a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="nav">
        <a href="/">← Back to Documentation Home</a>
        <a href="/api-docs.html">API Documentation</a>
    </div>
    ${htmlContent}
</body>
</html>`;
    
    fs.writeFileSync('public/data-dictionary.html', fullHtml);
    console.log('✅ Markdown docs built successfully');
  } else {
    console.warn('⚠️  data-dictionary.md not found, skipping...');
  }
} catch (error) {
  console.error('❌ Error building markdown docs:', error.message);
}

// Create index page
console.log('Creating index page...');
const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NVLP Documentation</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            color: #333;
        }
        h1 { color: #2c3e50; margin-bottom: 30px; }
        .docs-list {
            display: grid;
            gap: 20px;
            margin-top: 30px;
        }
        .doc-card {
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 20px;
            transition: box-shadow 0.2s;
        }
        .doc-card:hover {
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        .doc-card h3 {
            margin-top: 0;
            color: #007bff;
        }
        .doc-card a {
            color: #007bff;
            text-decoration: none;
            font-weight: 500;
        }
        .doc-card a:hover {
            text-decoration: underline;
        }
        .description {
            color: #666;
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <h1>NVLP Documentation</h1>
    <p>Welcome to the NVLP (Virtual Envelope Budget App) documentation portal.</p>
    
    <div class="docs-list">
        <div class="doc-card">
            <h3><a href="/api-docs.html">API Documentation</a></h3>
            <p class="description">Complete API specification with endpoints, request/response schemas, and examples.</p>
        </div>
        
        <div class="doc-card">
            <h3><a href="/data-dictionary.html">Data Dictionary</a></h3>
            <p class="description">Comprehensive reference for all data structures, fields, and relationships.</p>
        </div>
    </div>
</body>
</html>`;

fs.writeFileSync('public/index.html', indexHtml);
console.log('✅ Index page created successfully');
console.log('🎉 Build complete! Files are in the public/ directory');