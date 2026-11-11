import fs from 'node:fs';
fs.mkdirSync('dist',{recursive:true});fs.cpSync('public','dist',{recursive:true});
console.log('Copied editable public source to dist');
