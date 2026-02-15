const fs = require('fs');
const { createCanvas } = require('canvas');

// Create 192x192 logo
const canvas192 = createCanvas(192, 192);
const ctx192 = canvas192.getContext('2d');

// Fill background
ctx192.fillStyle = '#000000';
ctx192.fillRect(0, 0, 192, 192);

// Draw emoji (note: this is a placeholder, as Node canvas might not render emojis correctly)
ctx192.font = '120px Arial';
ctx192.fillStyle = '#ffffff';
ctx192.textAlign = 'center';
ctx192.textBaseline = 'middle';
ctx192.fillText('🧘', 96, 96);

// Save to file
const buffer192 = canvas192.toBuffer('image/png');
fs.writeFileSync('./images/logo-192.png', buffer192);

// Create 512x512 logo
const canvas512 = createCanvas(512, 512);
const ctx512 = canvas512.getContext('2d');

// Fill background
ctx512.fillStyle = '#000000';
ctx512.fillRect(0, 0, 512, 512);

// Draw emoji
ctx512.font = '320px Arial';
ctx512.fillStyle = '#ffffff';
ctx512.textAlign = 'center';
ctx512.textBaseline = 'middle';
ctx512.fillText('🧘', 256, 256);

// Save to file
const buffer512 = canvas512.toBuffer('image/png');
fs.writeFileSync('./images/logo-512.png', buffer512);

console.debug('Logo images created successfully!');