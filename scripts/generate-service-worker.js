/**
 * Service Worker Update Script
 * 
 * This script automatically:
 * 1. Scans the project directory for files to cache
 * 2. Updates the service-worker.js file with the new file list
 * 3. Increments the cache version
 */

const fs = require('fs');
const path = require('path');

// Import shared configuration
const { 
  directoriesToScan,
  fileExtensions,
  alwaysInclude,
  excludeFiles
} = require('../config/file-scan-config.js');

// Configuration
const serviceWorkerPath = './service-worker.js';

/**
 * Recursively scan directories for files
 */
function scanDirectory(dir, baseDir = '') {
  let results = [];
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const relativePath = path.join(baseDir, file);
    
    // Skip excluded files and directories
    if (excludeFiles.some(exclude => relativePath.includes(exclude))) {
      continue;
    }
    
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Recursively scan subdirectories
      results = results.concat(scanDirectory(fullPath, relativePath));
    } else {
      // Check if file extension should be included
      const ext = path.extname(file).toLowerCase();
      const fileName = path.basename(file);
      
      if (fileExtensions.includes(ext)) {
        // Get file size in bytes
        const fileSize = stat.size;
        
        // Convert Windows path separators to web format
        const webPath = relativePath.replace(/\\/g, '/');
        
        // Store both path and size
        results.push({
          path: webPath,
          size: fileSize
        });
      }
    }
  }
  
  return results;
}

/**
 * Get all files to cache
 */
function getFilesToCache() {
  // Convert always include files to objects with path and size=0 (we'll get actual size if file exists)
  let allFiles = alwaysInclude.map(path => {
    // For root path, use index.html for file size calculation
    const filePath = path === '' ? './index.html' : `./${path}`;
    // Keep the empty string for root path in the cache
    const cachePath = path;
    
    // Get file size if it exists
    let size = 0;
    try {
      if (fs.existsSync(filePath)) {
        const stat = fs.statSync(filePath);
        size = stat.size;
      }
    } catch (err) {
      console.warn(`Could not get size for ${filePath}:`, err.message);
    }
    
    return { path: cachePath, size };
  });
  
  // Scan directories
  for (const dir of directoriesToScan) {
    try {
      if (fs.existsSync(dir)) {
        const baseDir = dir === './' ? '' : dir;
        const files = scanDirectory(dir, baseDir);
        allFiles = allFiles.concat(files);
      }
    } catch (err) {
      console.error(`Error scanning directory ${dir}:`, err);
    }
  }
  
  // Remove duplicates by path
  const uniqueFiles = [];
  const paths = new Set();
  
  for (const file of allFiles) {
    if (!paths.has(file.path)) {
      paths.add(file.path);
      uniqueFiles.push(file);
    }
  }
  
  return uniqueFiles;
}

/**
 * Create a new service worker file
 */
function createServiceWorker() {
  // Get the files to cache
  const filesToCache = getFilesToCache();
  
  // Calculate total size in bytes
  const totalSizeBytes = filesToCache.reduce((total, file) => total + file.size, 0);
  
  // Convert to MB with 2 decimal places
  const totalSizeMB = (totalSizeBytes / (1024 * 1024)).toFixed(2);
  
  // Format the files array with paths only for backward compatibility
  const filesArrayString = filesToCache
    .map(file => `  '${file.path}'`)
    .join(',\n');
  
  // Create file size map as JSON string
  const fileSizesMapString = JSON.stringify(
    filesToCache.reduce((map, file) => {
      map[file.path] = file.size;
      return map;
    }, {}),
    null,
    2
  ).replace(/^/gm, '  '); // Add indentation
  
  // Create the service worker content
  const serviceWorkerContent = `/**
 * Monk Journey PWA Service Worker
 * Handles caching and updates for the game
 * Implements silent updates - downloads in background and applies on next app load
 */

const CACHE_NAME = 'monk-journey-cache';
const CACHE_VERSION = '1';
const CACHE_KEY = CACHE_NAME + '-v' + CACHE_VERSION;

// Total cache size in bytes and MB
const TOTAL_CACHE_SIZE_BYTES = ${totalSizeBytes};
const TOTAL_CACHE_SIZE_MB = ${totalSizeMB};

// Assets to cache
const ASSETS_TO_CACHE = [
${filesArrayString}
];

// File sizes in bytes for progress reporting
const FILE_SIZES = ${fileSizesMapString};

// Function to send progress updates to the client
function sendProgressUpdate(completed, total, currentFile, loadedBytes, totalBytes) {
  if (messagePort) {
    messagePort.postMessage({
      type: 'CACHE_PROGRESS',
      completed,
      total,
      currentFile,
      loadedBytes,
      totalBytes,
      totalSizeMB: TOTAL_CACHE_SIZE_MB
    });
  }
}

// Function to send update complete notification
function sendUpdateCompleteNotification() {
  if (messagePort) {
    messagePort.postMessage({
      type: 'UPDATE_COMPLETE',
      totalSizeMB: TOTAL_CACHE_SIZE_MB
    });
  }
}

// Communication channel
let messagePort = null;

// Listen for messages from the client
self.addEventListener('message', event => {
  // Check if it's the initialization message with the port
  if (event.data && event.data.type === 'INIT_PORT') {
    messagePort = event.data.port;
    console.debug('Communication channel established with client');
  }
});

// Function to cache files with progress tracking
async function cacheFilesWithProgress(cache) {
  const total = ASSETS_TO_CACHE.length;
  let completed = 0;
  let loadedBytes = 0;
  
  // Process files sequentially to ensure accurate progress tracking
  for (const url of ASSETS_TO_CACHE) {
    try {
      // Get file size (or 0 if not available)
      const fileSize = FILE_SIZES[url] || 0;
      
      // Send progress update before starting the fetch (only in debug mode)
      if (self.registration.scope.includes('debug=true')) {
        sendProgressUpdate(completed, total, url, loadedBytes, TOTAL_CACHE_SIZE_BYTES);
      }
      
      // Handle empty URL (root path) specially
      const fetchUrl = url === '' ? './' : url;
      
      // Fetch and cache the file with proper request
      const request = new Request(fetchUrl, { method: 'GET' });
      const response = await fetch(request);
      
      if (response.ok) {
        await cache.put(url, response.clone());
        completed++;
        loadedBytes += fileSize;
        
        // Send progress update after successful caching (only in debug mode)
        if (self.registration.scope.includes('debug=true')) {
          sendProgressUpdate(completed, total, url, loadedBytes, TOTAL_CACHE_SIZE_BYTES);
        }
      } else {
        console.warn(\`Failed to cache \${url}: \${response.status} \${response.statusText}\`);
        // Still increment completed to keep progress moving
        completed++;
      }
    } catch (error) {
      console.error(\`Error caching \${url}:\`, error);
      // Still increment completed to keep progress moving
      completed++;
    }
  }
  
  return completed;
}

// Install event - cache all static assets with progress tracking
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_KEY)
      .then(cache => {
        console.debug('Caching app assets in background');
        console.debug(\`Total cache size: \${TOTAL_CACHE_SIZE_MB} MB\`);
        return cacheFilesWithProgress(cache);
      })
      .then(completedCount => {
        console.debug(\`Cached \${completedCount} files successfully\`);
        // Skip waiting to activate the new service worker immediately
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Failed to cache assets:', error);
      })
  );
});

// Activate event - clean up old caches and notify clients
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName.startsWith(CACHE_NAME) && cacheName !== CACHE_KEY;
        }).map(cacheName => {
          console.debug('Deleting old cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      // Claim clients to ensure the new service worker takes control immediately
      return self.clients.claim();
    }).then(() => {
      // Notify clients that update is complete
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          // Send update complete notification
          client.postMessage({
            type: 'UPDATE_COMPLETE',
            totalSizeMB: TOTAL_CACHE_SIZE_MB
          });
        });
      });
    })
  );
});

// Fetch event - serve from cache, fall back to network
self.addEventListener('fetch', event => {
  // Get the requested URL
  const requestUrl = new URL(event.request.url);
  
  // Handle root path specially
  const cacheKey = requestUrl.pathname === '/' ? '' : requestUrl.pathname;
  
  event.respondWith(
    caches.match(cacheKey)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
      .catch(error => {
        console.error('Fetch error:', error);
        // You could return a custom offline page here
      })
  );
});
`;

  // Write the new service worker file
  fs.writeFileSync(serviceWorkerPath, serviceWorkerContent);
  
  console.debug(`✅ Service worker created successfully!`);
  console.debug(`📦 Cache version set to: 1`);
  console.debug(`🔢 Total files to cache: ${filesToCache.length}`);
  console.debug(`📊 Total cache size: ${totalSizeMB} MB`);
  console.debug(`🔄 Silent updates enabled - new versions will be applied automatically`);
  console.debug(`ℹ️ Background caching enabled for faster updates`);
}

/**
 * Update the service worker file
 */
function updateServiceWorker() {
  try {
    // Check if service worker file exists
    if (!fs.existsSync(serviceWorkerPath)) {
      console.debug('Service worker does not exist. Creating a new one...');
      createServiceWorker();
      return;
    }
    
    // Read the current service worker file
    let serviceWorkerContent = fs.readFileSync(serviceWorkerPath, 'utf8');
    
    // Extract the current version - handle case with comments after the version
    const versionMatch = serviceWorkerContent.match(/const CACHE_VERSION = ['"](\d+)['"](?:.*)?;/);
    if (!versionMatch) {
      throw new Error('Could not find CACHE_VERSION in service-worker.js');
    }
    
    // Increment the version
    const currentVersion = parseInt(versionMatch[1], 10);
    const newVersion = currentVersion + 1;
    
    // Check if there's a comment after the version
    const hasComment = versionMatch[0].includes('//');
    
    // Update the version in the file, preserving any comments
    if (hasComment) {
      // Extract the comment
      const commentMatch = versionMatch[0].match(/(\/\/.*)/);
      const comment = commentMatch ? commentMatch[1] : '';
      
      serviceWorkerContent = serviceWorkerContent.replace(
        /const CACHE_VERSION = ['"](\d+)['"](?:.*)?;/,
        `const CACHE_VERSION = '${newVersion}'; ${comment}`
      );
    } else {
      serviceWorkerContent = serviceWorkerContent.replace(
        /const CACHE_VERSION = ['"](\d+)['"](?:.*)?;/,
        `const CACHE_VERSION = '${newVersion}';`
      );
    }
    
    // Remove FORCE_UPDATE flag if it exists (we're using silent updates now)
    if (serviceWorkerContent.includes('const FORCE_UPDATE =')) {
      serviceWorkerContent = serviceWorkerContent.replace(
        /\/\/ Set this to true to force update without prompting the user\nconst FORCE_UPDATE = (?:true|false);(\n|$)/,
        ''
      );
    }
    
    // Get the files to cache
    const filesToCache = getFilesToCache();
    
    // Calculate total size in bytes
    const totalSizeBytes = filesToCache.reduce((total, file) => total + file.size, 0);
    
    // Convert to MB with 2 decimal places
    const totalSizeMB = (totalSizeBytes / (1024 * 1024)).toFixed(2);
    
    // Format the files array with paths only for backward compatibility
    const filesArrayString = filesToCache
      .map(file => `  '${file.path}'`)
      .join(',\n');
    
    // Create file size map as JSON string
    const fileSizesMapString = JSON.stringify(
      filesToCache.reduce((map, file) => {
        map[file.path] = file.size;
        return map;
      }, {}),
      null,
      2
    ).replace(/^/gm, '  '); // Add indentation
    
    // Update the total cache size constants
    if (serviceWorkerContent.includes('TOTAL_CACHE_SIZE_BYTES')) {
      // Update existing size constants
      serviceWorkerContent = serviceWorkerContent.replace(
        /const TOTAL_CACHE_SIZE_BYTES = \d+;/,
        `const TOTAL_CACHE_SIZE_BYTES = ${totalSizeBytes};`
      );
      
      serviceWorkerContent = serviceWorkerContent.replace(
        /const TOTAL_CACHE_SIZE_MB = [\d\.]+;/,
        `const TOTAL_CACHE_SIZE_MB = ${totalSizeMB};`
      );
    } else {
      // Add size constants if they don't exist
      serviceWorkerContent = serviceWorkerContent.replace(
        /(const CACHE_KEY = CACHE_NAME \+ '-v' \+ CACHE_VERSION;)/,
        `$1\n\n// Total cache size in bytes and MB\nconst TOTAL_CACHE_SIZE_BYTES = ${totalSizeBytes};\nconst TOTAL_CACHE_SIZE_MB = ${totalSizeMB};`
      );
    }
    
    // Replace the ASSETS_TO_CACHE array
    serviceWorkerContent = serviceWorkerContent.replace(
      /const ASSETS_TO_CACHE = \[([\s\S]*?)\];/,
      `const ASSETS_TO_CACHE = [\n${filesArrayString}\n];`
    );
    
    // Update or add the FILE_SIZES map
    if (serviceWorkerContent.includes('const FILE_SIZES =')) {
      serviceWorkerContent = serviceWorkerContent.replace(
        /const FILE_SIZES = \{([\s\S]*?)\};/,
        `const FILE_SIZES = ${fileSizesMapString};`
      );
    } else {
      serviceWorkerContent = serviceWorkerContent.replace(
        /const ASSETS_TO_CACHE = \[([\s\S]*?)\];/,
        `const ASSETS_TO_CACHE = [\n${filesArrayString}\n];\n\n// File sizes in bytes for progress reporting\nconst FILE_SIZES = ${fileSizesMapString};`
      );
    }
    
    // Make sure the sendProgressUpdate function includes size information
    if (serviceWorkerContent.includes('function sendProgressUpdate(')) {
      // Check if the function already has size parameters
      if (!serviceWorkerContent.includes('loadedBytes, totalBytes')) {
        serviceWorkerContent = serviceWorkerContent.replace(
          /function sendProgressUpdate\(completed, total, currentFile\) \{([\s\S]*?)}/,
          `function sendProgressUpdate(completed, total, currentFile, loadedBytes, totalBytes) {
  if (messagePort) {
    messagePort.postMessage({
      type: 'CACHE_PROGRESS',
      completed,
      total,
      currentFile,
      loadedBytes,
      totalBytes,
      totalSizeMB: TOTAL_CACHE_SIZE_MB
    });
  }
}`
        );
      }
    }
    
    // Make sure the cacheFilesWithProgress function tracks size and handles empty URLs correctly
    if (serviceWorkerContent.includes('function cacheFilesWithProgress(')) {
      // First ensure we have loadedBytes tracking
      if (!serviceWorkerContent.includes('loadedBytes = 0')) {
        serviceWorkerContent = serviceWorkerContent.replace(
          /function cacheFilesWithProgress\(cache\) \{([\s\S]*?)let completed = 0;/,
          `function cacheFilesWithProgress(cache) {$1let completed = 0;\n  let loadedBytes = 0;`
        );
      }
      
      // Update the file size tracking in the loop
      if (!serviceWorkerContent.includes('const fileSize = FILE_SIZES[url]')) {
        serviceWorkerContent = serviceWorkerContent.replace(
          /for \(const url of ASSETS_TO_CACHE\) \{([\s\S]*?)sendProgressUpdate\(completed, total, url\);/,
          `for (const url of ASSETS_TO_CACHE) {$1
      // Get file size (or 0 if not available)
      const fileSize = FILE_SIZES[url] || 0;
      
      // Send progress update before starting the fetch
      sendProgressUpdate(completed, total, url, loadedBytes, TOTAL_CACHE_SIZE_BYTES);`
        );
      }
      
      // Add special handling for empty URLs
      if (!serviceWorkerContent.includes('const fetchUrl = url === ')) {
        serviceWorkerContent = serviceWorkerContent.replace(
          /(sendProgressUpdate\(completed, total, url, loadedBytes, TOTAL_CACHE_SIZE_BYTES\);[\s\S]*?)const response = await fetch\(url\);/,
          `$1
      // Handle empty URL (root path) specially
      const fetchUrl = url === '' ? './' : url;
      
      // Fetch and cache the file with proper request
      const request = new Request(fetchUrl, { method: 'GET' });
      const response = await fetch(request);`
        );
      }
      
      // Make sure we're cloning the response
      if (!serviceWorkerContent.includes('response.clone()')) {
        serviceWorkerContent = serviceWorkerContent.replace(
          /await cache\.put\(url, response\);/,
          `await cache.put(url, response.clone());`
        );
      }
      
      // Update the progress after successful caching
      if (!serviceWorkerContent.includes('loadedBytes += fileSize')) {
        serviceWorkerContent = serviceWorkerContent.replace(
          /completed\+\+;([\s\S]*?)sendProgressUpdate\(completed, total, url\);/,
          `completed++;\n        loadedBytes += fileSize;$1
        // Send progress update after successful caching
        sendProgressUpdate(completed, total, url, loadedBytes, TOTAL_CACHE_SIZE_BYTES);`
        );
      }
      
      // Update the error cases
      serviceWorkerContent = serviceWorkerContent.replace(
        /sendProgressUpdate\(completed, total, `Failed: \${url}`\);/g,
        `sendProgressUpdate(completed, total, \`Failed: \${url}\`, loadedBytes, TOTAL_CACHE_SIZE_BYTES);`
      );
      
      serviceWorkerContent = serviceWorkerContent.replace(
        /sendProgressUpdate\(completed, total, `Error: \${url}`\);/g,
        `sendProgressUpdate(completed, total, \`Error: \${url}\`, loadedBytes, TOTAL_CACHE_SIZE_BYTES);`
      );
    }
    
    // Update the fetch event handler to properly handle root URL
    if (serviceWorkerContent.includes('self.addEventListener(\'fetch\'') && 
        !serviceWorkerContent.includes('const requestUrl = new URL(event.request.url)')) {
      serviceWorkerContent = serviceWorkerContent.replace(
        /self\.addEventListener\('fetch', event => \{[\s\S]*?event\.respondWith\(/,
        `self.addEventListener('fetch', event => {
  // Get the requested URL
  const requestUrl = new URL(event.request.url);
  
  // Handle root path specially
  const cacheKey = requestUrl.pathname === '/' ? '' : requestUrl.pathname;
  
  event.respondWith(`
      );
      
      // Update the cache match to use cacheKey
      serviceWorkerContent = serviceWorkerContent.replace(
        /caches\.match\(event\.request\)/,
        `caches.match(cacheKey)`
      );
    }
    
    // Add logging for total cache size
    if (serviceWorkerContent.includes('console.debug(\'Caching app assets') && 
        !serviceWorkerContent.includes('Total cache size:')) {
      serviceWorkerContent = serviceWorkerContent.replace(
        /console\.log\('Caching app assets/,
        `console.debug('Caching app assets with progress tracking');\n        console.debug(\`Total cache size: \${TOTAL_CACHE_SIZE_MB} MB with progress tracking\`)`
      );
    }
    
    // Write the updated service worker file
    fs.writeFileSync(serviceWorkerPath, serviceWorkerContent);
    
    // Check if FORCE_UPDATE is enabled
    const forceUpdateMatch = serviceWorkerContent.match(/const FORCE_UPDATE = (true|false);/);
    const forceUpdate = forceUpdateMatch ? forceUpdateMatch[1] : 'false';
    
    console.debug(`✅ Service worker updated successfully!`);
    console.debug(`📦 Cache version incremented to: ${newVersion}`);
    console.debug(`🔢 Total files to cache: ${filesToCache.length}`);
    console.debug(`📊 Total cache size: ${totalSizeMB} MB`);
    console.debug(`${forceUpdate === 'true' ? '🔄' : '🚫'} FORCE_UPDATE is set to: ${forceUpdate}`);
  } catch (err) {
    console.error('Error updating service worker:', err);
    
    // If there was an error updating, try creating a new one
    console.debug('Attempting to create a new service worker...');
    createServiceWorker();
  }
}

// Run the update
updateServiceWorker();