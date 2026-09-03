const express = require("express");
const cors = require("cors");
const multer = require("multer");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
var html_to_pdf = require('html-pdf-node');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"].join(","),
  allowedHeaders: ["Content-Type", "Authorization", "Accept", "X-Requested-With"].join(","),
  optionsSuccessStatus: 204
}));
app.options(/.*/, cors());
app.use(express.json({ limit: "10mb" }));

app.get("/health", (_, res) => res.json({ ok: true }));

app.post("/pdf", async (req, res) => {
  try {
    const { id, token } = req.body;
    if (!id || !token) return res.status(400).json({ error: "Campi 'id' e 'token' obbligatori nel body" });

    const url = `${process.env.BASE_URL}/cv-render/${id}/${token}`;
    let file = { url };
    const options = {
      format: 'A4',
      printBackground: true,
      margin: { top: '11mm', right: '15mm', bottom: '11mm', left: '15mm' }, // il componente ha già il suo padding interno
      waitUntil: 'networkidle0',
      timeout: 30000,
      viewport: { width: 794, height: 1123 },   // <-- questa è la chiave: A4 esatto a 96dpi
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-font-subpixel-positioning',
        '--font-render-hinting=none'
      ]
    };

    const pdfBuffer = await html_to_pdf.generatePdf(file, options);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=output.pdf");
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const port = process.env.PORT || 3211;
app.listen(port, () => console.log(`Server avviato su http://localhost:${port}`));
