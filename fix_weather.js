const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'index.html');
let content = fs.readFileSync(filePath, 'utf8');

// Find the end of the new function (closing brace after the catch block)
// then find the start of // ── NEWSLETTER ──
// and delete everything between them

const newFnEnd = '  }\n}\n';
const newsletterStart = '\n// ── NEWSLETTER ──';

const splitPoint = content.indexOf(newFnEnd + newsletterStart);

if (splitPoint === -1) {
  // Try CRLF
  const newFnEndCRLF = '  }\r\n}\r\n';
  const newsletterStartCRLF = '\r\n// ── NEWSLETTER ──';
  const splitPointCRLF = content.indexOf(newFnEndCRLF + newsletterStartCRLF);
  
  if (splitPointCRLF === -1) {
    // Find both markers separately and report
    const fnClose = content.indexOf('}\n// ── NEWSLETTER ──');
    const fnCloseCRLF = content.indexOf('}\r\n// ── NEWSLETTER ──');
    console.log('Direct join not found.');
    console.log('Looking for function close + newsletter...');
    if (fnClose !== -1) console.log('Found LF version at char', fnClose);
    if (fnCloseCRLF !== -1) console.log('Found CRLF version at char', fnCloseCRLF);
    
    // Show what's between the two function closes and newsletter comment
    const nIdx = content.indexOf('// ── NEWSLETTER ──');
    if (nIdx !== -1) {
      console.log('\nContent 300 chars before newsletter comment:');
      console.log(JSON.stringify(content.slice(nIdx - 300, nIdx)));
    }
    process.exit(1);
  }
}

// Strategy: find newsletter comment, walk back to find the SECOND closing }
// (first } closes the catch, second } closes the new function)
// delete everything from character after second } to just before newsletter comment

const nIdx = content.indexOf('// ── NEWSLETTER ──');
if (nIdx === -1) {
  console.log('ERROR: newsletter comment not found');
  process.exit(1);
}

// Find the new function's closing brace - it's the } that appears right before
// the orphaned block. The orphaned block starts with whitespace + "const el"
const orphanStart = content.indexOf('\n  const el = document.getElementById(\'home-conditions-preview\');\n  if(!el) return;');

if (orphanStart === -1) {
  console.log('SUCCESS: orphaned block not found - file may already be clean');
  process.exit(0);
}

// Find the closing } of the orphaned old function body just before newsletter
// Walk backwards from newsletter comment to find the lone }
let orphanEnd = nIdx;
// Step back past any blank lines
while (orphanEnd > 0 && (content[orphanEnd-1] === '\n' || content[orphanEnd-1] === '\r')) {
  orphanEnd--;
}
// Now should be at the closing } of orphaned block
// Step back past the }
if (content[orphanEnd-1] === '}') {
  orphanEnd--; // now points just before the }
}

// Remove from orphanStart to orphanEnd (the } will be re-included as part of new function)
const fixed = content.slice(0, orphanStart) + '\n' + content.slice(orphanEnd);

fs.writeFileSync(filePath, fixed, 'utf8');
console.log('SUCCESS: orphaned block removed');
console.log('Characters removed:', content.length - fixed.length);
