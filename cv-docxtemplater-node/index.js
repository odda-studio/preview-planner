const fs = require("fs");
const path = require("path");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");

const templatePath = process.argv[2] || path.join(__dirname, "templates", "template.docx");
const dataPath = process.argv[3] || path.join(__dirname, "data.json");
const outputPath = process.argv[4] || path.join(__dirname, "output", "cv-output.docx");

function renderDocx(templatePath, dataPath, outputPath) {
  const content = fs.readFileSync(templatePath, "binary");
  const zip = new PizZip(content);

  const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));


  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => ""
  });

  try {
    doc.render(data);
  } catch (error) {
    console.error("Errore durante il render del DOCX:");
    console.error(JSON.stringify({
      message: error.message,
      properties: error.properties
    }, null, 2));
    process.exit(1);
  }

  const buffer = doc.getZip().generate({
    type: "nodebuffer",
    compression: "DEFLATE"
  });

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, buffer);


  
  console.log(`DOCX generato: ${outputPath}`);
}

renderDocx(templatePath, dataPath, outputPath);
