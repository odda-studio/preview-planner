const fs = require('fs');
const xml = fs.readFileSync('template.xml', 'utf8');

console.log('Contains 00000009:', xml.includes('w14:paraId="00000009"'));
console.log('Contains 0000000B:', xml.includes('w14:paraId="0000000B"'));
console.log('Contains 0000000F:', xml.includes('w14:paraId="0000000F"'));
console.log('Contains 0000002D:', xml.includes('w14:paraId="0000002D"'));
console.log('Contains 00000031:', xml.includes('w14:paraId="00000031"'));
console.log('Contains 00000032:', xml.includes('w14:paraId="00000032"'));
console.log('Contains 00000043:', xml.includes('w14:paraId="00000043"'));
console.log('Contains 00000075:', xml.includes('w14:paraId="00000075"'));
console.log('Contains 0000007A:', xml.includes('w14:paraId="0000007A"'));

// Test single para regex
const r = /<w:p\b[^>]*?w14:paraId="00000009"[\s\S]*?<\/w:p>/;
const m = r.exec(xml);
console.log('\nPara 00000009 found:', !!m);
if (m) console.log('Match length:', m[0].length, '\nFirst 200:', m[0].substring(0, 200));

// Test range regex
const rRange = /(<w:p\b[^>]*?w14:paraId="00000009"[\s\S]*?<\/w:p>)[\s\S]*?(<w:p\b[^>]*?w14:paraId="0000000B"[\s\S]*?<\/w:p>)/;
const mRange = rRange.exec(xml);
console.log('\nRange 00000009->0000000B found:', !!mRange);
if (mRange) console.log('Range match length:', mRange[0].length);
