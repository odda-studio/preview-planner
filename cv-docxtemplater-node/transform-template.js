/**
 * transform-template.js
 * Reads template.xml, replaces hardcoded sections with docxtemplater loop tags,
 * and writes the result back to template.xml.
 *
 * Sections replaced:
 *  - HIGHLIGHTS  → {#skills}{name}{/skills}
 *  - OTHER       → {#otherSkills}{skill}{/otherSkills}
 *  - LANGUAGES   → {#languages}{name} {level}{/languages}
 *  - EXPERIENCE  → {#experiences}...{/experiences}
 *  - TRAINING AND CERTIFICATES → {#trainingAndCertificates}...{/trainingAndCertificates}
 */

const fs = require("fs");
const path = require("path");

const xmlPath = path.join(__dirname, "template.xml");
let xml = fs.readFileSync(xmlPath, "utf8");

/**
 * Returns a regex that matches a complete <w:p> block containing the given paraId.
 * Uses a non-greedy approach to grab one paragraph.
 */
function paraRegex(paraId) {
  return new RegExp(
    `<w:p\\b[^>]*?w14:paraId="${paraId}"[\\s\\S]*?</w:p>`,
    "g"
  );
}

/**
 * Returns a regex that matches all content from the first <w:p> with startId
 * through (inclusive) the last </w:p> of the <w:p> with endId.
 */
function paraRangeRegex(startId, endId) {
  return new RegExp(
    `(<w:p\\b[^>]*?w14:paraId="${startId}"[\\s\\S]*?</w:p>)[\\s\\S]*?(<w:p\\b[^>]*?w14:paraId="${endId}"[\\s\\S]*?</w:p>)`,
    "g"
  );
}

// ─── Helpers to build styled XML paragraphs ─────────────────────────────────

const PARA_ATTRS = `w:rsidR="00000000" w:rsidDel="00000000" w:rsidP="00000000" w:rsidRDefault="00000000" w:rsidRPr="00000000"`;

function loopTagPara(id, tag) {
  return `<w:p ${PARA_ATTRS} w14:paraId="${id}">
                        <w:pPr>
                            <w:spacing w:before="0" w:line="240" w:lineRule="auto" />
                            <w:rPr>
                                <w:rFonts w:ascii="Epilogue" w:cs="Epilogue" w:eastAsia="Epilogue" w:hAnsi="Epilogue" />
                                <w:sz w:val="22" />
                                <w:szCs w:val="22" />
                            </w:rPr>
                        </w:pPr>
                        <w:r w:rsidDel="00000000" w:rsidR="00000000" w:rsidRPr="00000000">
                            <w:rPr><w:rtl w:val="0" /></w:rPr>
                            <w:t>${tag}</w:t>
                        </w:r>
                    </w:p>`;
}

// ─── 1. HIGHLIGHTS → {#skills} / {/skills} ───────────────────────────────────
// Replace paragraphs 00000009, 0000000A, 0000000B

const highlightLoop = `${loopTagPara("A1000001", "{#skills}")}
                    <w:p ${PARA_ATTRS} w14:paraId="A1000002">
                        <w:pPr>
                            <w:spacing w:before="0" w:line="240" w:lineRule="auto" />
                            <w:rPr>
                                <w:rFonts w:ascii="Epilogue SemiBold" w:cs="Epilogue SemiBold" w:eastAsia="Epilogue SemiBold" w:hAnsi="Epilogue SemiBold" />
                                <w:sz w:val="22" />
                                <w:szCs w:val="22" />
                            </w:rPr>
                        </w:pPr>
                        <w:r w:rsidDel="00000000" w:rsidR="00000000" w:rsidRPr="00000000">
                            <w:rPr>
                                <w:rFonts w:ascii="Epilogue SemiBold" w:cs="Epilogue SemiBold" w:eastAsia="Epilogue SemiBold" w:hAnsi="Epilogue SemiBold" />
                                <w:sz w:val="22" />
                                <w:szCs w:val="22" />
                                <w:rtl w:val="0" />
                            </w:rPr>
                            <w:t>{name}</w:t>
                        </w:r>
                    </w:p>
                    ${loopTagPara("A1000003", "{/skills}")}`;

xml = xml.replace(paraRangeRegex("00000009", "0000000B"), highlightLoop);

// ─── 2. OTHER → {#otherSkills} / {/otherSkills} ──────────────────────────────
// Replace paragraphs 0000000F through 0000002D

const otherLoop = `${loopTagPara("A2000001", "{#otherSkills}")}
                    <w:p ${PARA_ATTRS} w14:paraId="A2000002">
                        <w:pPr>
                            <w:spacing w:before="0" w:line="240" w:lineRule="auto" />
                            <w:rPr>
                                <w:rFonts w:ascii="Epilogue" w:cs="Epilogue" w:eastAsia="Epilogue" w:hAnsi="Epilogue" />
                                <w:sz w:val="22" />
                                <w:szCs w:val="22" />
                            </w:rPr>
                        </w:pPr>
                        <w:r w:rsidDel="00000000" w:rsidR="00000000" w:rsidRPr="00000000">
                            <w:rPr>
                                <w:rFonts w:ascii="Epilogue" w:cs="Epilogue" w:eastAsia="Epilogue" w:hAnsi="Epilogue" />
                                <w:sz w:val="22" />
                                <w:szCs w:val="22" />
                                <w:rtl w:val="0" />
                            </w:rPr>
                            <w:t>{skill}</w:t>
                        </w:r>
                    </w:p>
                    ${loopTagPara("A2000003", "{/otherSkills}")}`;

xml = xml.replace(paraRangeRegex("0000000F", "0000002D"), otherLoop);

// ─── 3. LANGUAGES → {#languages} / {/languages} ──────────────────────────────
// Replace paragraphs 00000031 and 00000032

const langLoop = `${loopTagPara("A3000001", "{#languages}")}
                    <w:p ${PARA_ATTRS} w14:paraId="A3000002">
                        <w:pPr>
                            <w:spacing w:before="0" w:line="240" w:lineRule="auto" />
                            <w:rPr>
                                <w:rFonts w:ascii="Epilogue" w:cs="Epilogue" w:eastAsia="Epilogue" w:hAnsi="Epilogue" />
                                <w:sz w:val="22" />
                                <w:szCs w:val="22" />
                            </w:rPr>
                        </w:pPr>
                        <w:r w:rsidDel="00000000" w:rsidR="00000000" w:rsidRPr="00000000">
                            <w:rPr>
                                <w:rFonts w:ascii="Epilogue" w:cs="Epilogue" w:eastAsia="Epilogue" w:hAnsi="Epilogue" />
                                <w:sz w:val="22" />
                                <w:szCs w:val="22" />
                                <w:rtl w:val="0" />
                            </w:rPr>
                            <w:t xml:space="preserve">{name} </w:t>
                        </w:r>
                        <w:r w:rsidDel="00000000" w:rsidR="00000000" w:rsidRPr="00000000">
                            <w:rPr>
                                <w:rFonts w:ascii="Fragment Mono" w:cs="Fragment Mono" w:eastAsia="Fragment Mono" w:hAnsi="Fragment Mono" />
                                <w:color w:val="999999" />
                                <w:sz w:val="18" />
                                <w:szCs w:val="18" />
                                <w:rtl w:val="0" />
                            </w:rPr>
                            <w:t>{level}</w:t>
                        </w:r>
                    </w:p>
                    ${loopTagPara("A3000003", "{/languages}")}`;

xml = xml.replace(paraRangeRegex("00000031", "00000032"), langLoop);

// ─── 4. EXPERIENCE → {#experiences} / {/experiences} ────────────────────────
// Replace paragraphs 00000043 through 00000075
// Each experience: date header paragraph + spacer + description paragraph + spacer

const expLoop = `${loopTagPara("A4000001", "{#experiences}")}
                    <w:p ${PARA_ATTRS} w14:paraId="A4000002">
                        <w:pPr>
                            <w:widowControl w:val="0" />
                            <w:spacing w:before="0" w:lineRule="auto" />
                            <w:rPr>
                                <w:rFonts w:ascii="Epilogue Medium" w:cs="Epilogue Medium" w:eastAsia="Epilogue Medium" w:hAnsi="Epilogue Medium" />
                                <w:sz w:val="22" />
                                <w:szCs w:val="22" />
                            </w:rPr>
                        </w:pPr>
                        <w:r w:rsidDel="00000000" w:rsidR="00000000" w:rsidRPr="00000000">
                            <w:rPr>
                                <w:rFonts w:ascii="Fragment Mono" w:cs="Fragment Mono" w:eastAsia="Fragment Mono" w:hAnsi="Fragment Mono" />
                                <w:color w:val="999999" />
                                <w:sz w:val="18" />
                                <w:szCs w:val="18" />
                                <w:rtl w:val="0" />
                            </w:rPr>
                            <w:t xml:space="preserve">{from}-{to}</w:t>
                        </w:r>
                        <w:r w:rsidDel="00000000" w:rsidR="00000000" w:rsidRPr="00000000">
                            <w:rPr>
                                <w:rFonts w:ascii="Epilogue" w:cs="Epilogue" w:eastAsia="Epilogue" w:hAnsi="Epilogue" />
                                <w:sz w:val="24" />
                                <w:szCs w:val="24" />
                                <w:rtl w:val="0" />
                            </w:rPr>
                            <w:br w:type="textWrapping" />
                        </w:r>
                        <w:r w:rsidDel="00000000" w:rsidR="00000000" w:rsidRPr="00000000">
                            <w:rPr>
                                <w:rFonts w:ascii="Epilogue Medium" w:cs="Epilogue Medium" w:eastAsia="Epilogue Medium" w:hAnsi="Epilogue Medium" />
                                <w:sz w:val="22" />
                                <w:szCs w:val="22" />
                                <w:rtl w:val="0" />
                            </w:rPr>
                            <w:t xml:space="preserve">{head} - {title}</w:t>
                        </w:r>
                    </w:p>
                    <w:p ${PARA_ATTRS} w14:paraId="A4000003">
                        <w:pPr>
                            <w:widowControl w:val="0" />
                            <w:spacing w:before="0" w:lineRule="auto" />
                            <w:rPr>
                                <w:rFonts w:ascii="Epilogue" w:cs="Epilogue" w:eastAsia="Epilogue" w:hAnsi="Epilogue" />
                                <w:color w:val="999999" />
                                <w:sz w:val="12" />
                                <w:szCs w:val="12" />
                            </w:rPr>
                        </w:pPr>
                        <w:r w:rsidDel="00000000" w:rsidR="00000000" w:rsidRPr="00000000">
                            <w:rPr><w:rtl w:val="0" /></w:rPr>
                        </w:r>
                    </w:p>
                    <w:p ${PARA_ATTRS} w14:paraId="A4000004">
                        <w:pPr>
                            <w:widowControl w:val="0" />
                            <w:spacing w:before="0" w:lineRule="auto" />
                            <w:rPr>
                                <w:rFonts w:ascii="Epilogue" w:cs="Epilogue" w:eastAsia="Epilogue" w:hAnsi="Epilogue" />
                                <w:color w:val="999999" />
                                <w:sz w:val="18" />
                                <w:szCs w:val="18" />
                                <w:highlight w:val="white" />
                            </w:rPr>
                        </w:pPr>
                        <w:r w:rsidDel="00000000" w:rsidR="00000000" w:rsidRPr="00000000">
                            <w:rPr>
                                <w:rFonts w:ascii="Epilogue" w:cs="Epilogue" w:eastAsia="Epilogue" w:hAnsi="Epilogue" />
                                <w:color w:val="999999" />
                                <w:sz w:val="18" />
                                <w:szCs w:val="18" />
                                <w:highlight w:val="white" />
                                <w:rtl w:val="0" />
                            </w:rPr>
                            <w:t xml:space="preserve">{subtitle}</w:t>
                        </w:r>
                    </w:p>
                    <w:p ${PARA_ATTRS} w14:paraId="A4000005">
                        <w:pPr>
                            <w:spacing w:before="0" w:line="276" w:lineRule="auto" />
                            <w:rPr>
                                <w:rFonts w:ascii="Epilogue" w:cs="Epilogue" w:eastAsia="Epilogue" w:hAnsi="Epilogue" />
                                <w:color w:val="999999" />
                                <w:sz w:val="18" />
                                <w:szCs w:val="18" />
                                <w:highlight w:val="white" />
                            </w:rPr>
                        </w:pPr>
                        <w:r w:rsidDel="00000000" w:rsidR="00000000" w:rsidRPr="00000000">
                            <w:rPr>
                                <w:rFonts w:ascii="Epilogue" w:cs="Epilogue" w:eastAsia="Epilogue" w:hAnsi="Epilogue" />
                                <w:color w:val="999999" />
                                <w:sz w:val="18" />
                                <w:szCs w:val="18" />
                                <w:highlight w:val="white" />
                                <w:rtl w:val="0" />
                            </w:rPr>
                            <w:t>{description}</w:t>
                        </w:r>
                    </w:p>
                    <w:p ${PARA_ATTRS} w14:paraId="A4000006">
                        <w:pPr>
                            <w:spacing w:before="0" w:line="276" w:lineRule="auto" />
                            <w:rPr>
                                <w:rFonts w:ascii="Epilogue" w:cs="Epilogue" w:eastAsia="Epilogue" w:hAnsi="Epilogue" />
                                <w:color w:val="999999" />
                                <w:sz w:val="22" />
                                <w:szCs w:val="22" />
                                <w:highlight w:val="white" />
                            </w:rPr>
                        </w:pPr>
                        <w:r w:rsidDel="00000000" w:rsidR="00000000" w:rsidRPr="00000000">
                            <w:rPr><w:rtl w:val="0" /></w:rPr>
                        </w:r>
                    </w:p>
                    ${loopTagPara("A4000007", "{/experiences}")}`;

xml = xml.replace(paraRangeRegex("00000043", "00000075"), expLoop);

// ─── 5. TRAINING AND CERTIFICATES → {#trainingAndCertificates} ───────────────
// Replace paragraph 0000007A (+ empty spacer 0000007B)

const trainingLoop = `${loopTagPara("A5000001", "{#trainingAndCertificates}")}
                    <w:p ${PARA_ATTRS} w14:paraId="A5000002">
                        <w:pPr>
                            <w:widowControl w:val="0" />
                            <w:spacing w:before="0" w:lineRule="auto" />
                            <w:rPr>
                                <w:rFonts w:ascii="Epilogue Medium" w:cs="Epilogue Medium" w:eastAsia="Epilogue Medium" w:hAnsi="Epilogue Medium" />
                                <w:sz w:val="22" />
                                <w:szCs w:val="22" />
                            </w:rPr>
                        </w:pPr>
                        <w:r w:rsidDel="00000000" w:rsidR="00000000" w:rsidRPr="00000000">
                            <w:rPr>
                                <w:rFonts w:ascii="Fragment Mono" w:cs="Fragment Mono" w:eastAsia="Fragment Mono" w:hAnsi="Fragment Mono" />
                                <w:color w:val="999999" />
                                <w:sz w:val="18" />
                                <w:szCs w:val="18" />
                                <w:rtl w:val="0" />
                            </w:rPr>
                            <w:t>{year}</w:t>
                        </w:r>
                        <w:r w:rsidDel="00000000" w:rsidR="00000000" w:rsidRPr="00000000">
                            <w:rPr>
                                <w:rFonts w:ascii="Epilogue" w:cs="Epilogue" w:eastAsia="Epilogue" w:hAnsi="Epilogue" />
                                <w:sz w:val="24" />
                                <w:szCs w:val="24" />
                                <w:rtl w:val="0" />
                            </w:rPr>
                            <w:br w:type="textWrapping" />
                        </w:r>
                        <w:r w:rsidDel="00000000" w:rsidR="00000000" w:rsidRPr="00000000">
                            <w:rPr>
                                <w:rFonts w:ascii="Epilogue Medium" w:cs="Epilogue Medium" w:eastAsia="Epilogue Medium" w:hAnsi="Epilogue Medium" />
                                <w:sz w:val="22" />
                                <w:szCs w:val="22" />
                                <w:rtl w:val="0" />
                            </w:rPr>
                            <w:t>{title}</w:t>
                        </w:r>
                    </w:p>
                    ${loopTagPara("A5000003", "{/trainingAndCertificates}")}`;

xml = xml.replace(paraRangeRegex("0000007A", "0000007B"), trainingLoop);

// ─── Write result ─────────────────────────────────────────────────────────────
fs.writeFileSync(xmlPath, xml, "utf8");
console.log("✓ template.xml aggiornato con i tag docxtemplater per tutti i loop.");

// ─── Verify replacements ──────────────────────────────────────────────────────
const checks = [
  ["{#skills}", "HIGHLIGHTS loop start"],
  ["{/skills}", "HIGHLIGHTS loop end"],
  ["{#otherSkills}", "OTHER loop start"],
  ["{/otherSkills}", "OTHER loop end"],
  ["{#languages}", "LANGUAGES loop start"],
  ["{/languages}", "LANGUAGES loop end"],
  ["{#experiences}", "EXPERIENCE loop start"],
  ["{/experiences}", "EXPERIENCE loop end"],
  ["{#trainingAndCertificates}", "TRAINING loop start"],
  ["{/trainingAndCertificates}", "TRAINING loop end"],
];

const newXml = fs.readFileSync(xmlPath, "utf8");
checks.forEach(([tag, label]) => {
  if (newXml.includes(tag)) {
    console.log(`  ✓ ${label}: found`);
  } else {
    console.error(`  ✗ ${label}: MISSING`);
  }
});
