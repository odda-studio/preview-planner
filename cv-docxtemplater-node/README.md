# CV Docxtemplater Node

Progetto Node.js per compilare un template DOCX esportato da Google Docs usando `docxtemplater`.

## Installazione

```bash
npm install
```

## Test rapido CLI

```bash
npm start
```

Genera:

```text
output/cv-output.docx
```

## CLI con file personalizzati

```bash
node index.js ./templates/template.docx ./data.json ./output/cv-output.docx
```

## Sintassi template

Campi semplici:

```text
{name}
{role}
{overview}
```

Loop:

```text
{#skills}
{name}
{/skills}
```

## API opzionale

Avvia il server:

```bash
npm run api
```

Test con curl:

```bash
curl -X POST http://localhost:3000/render \
  -F "template=@templates/template.docx" \
  -F "data=$(cat data.json)" \
  --output output/cv-output-from-api.docx
```
