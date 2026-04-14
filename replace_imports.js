const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      if (f !== 'node_modules' && f !== '.next') {
        walkDir(dirPath, callback);
      }
    } else if (f.endsWith('.js')) {
      callback(path.join(dir, f));
    }
  });
}

walkDir(__dirname, function(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('lib/db')) {
    content = content.replace(/lib\/supabase/g, 'lib/db');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated', filePath);
  }
});
