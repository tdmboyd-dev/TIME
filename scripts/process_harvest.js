/**
 * Process Harvested Bots
 *
 * This script moves bot files from harvest folders into the main incoming folder
 * where the Bot Drop Zone will automatically detect and process them.
 *
 * Run: node scripts/process_harvest.js
 */

const fs = require('fs');
const path = require('path');

const INCOMING_PATH = './dropzone/incoming';

// Get all harvest folders
const harvestFolders = fs.readdirSync(INCOMING_PATH).filter(f => {
  const fullPath = path.join(INCOMING_PATH, f);
  return fs.statSync(fullPath).isDirectory() && f.startsWith('harvest');
});

console.log('\n============================================================');
console.log('TIME Bot Processor - Moving Harvested Bots');
console.log('============================================================\n');

if (harvestFolders.length === 0) {
  console.log('No harvest folders found in ./dropzone/incoming');
  console.log('Run harvest_bots.js first to download bots.');
  process.exit(0);
}

console.log(`Found ${harvestFolders.length} harvest folders\n`);

let totalMoved = 0;
let totalSkipped = 0;

for (const folder of harvestFolders) {
  const folderPath = path.join(INCOMING_PATH, folder);
  const files = fs.readdirSync(folderPath);

  console.log(`\n📁 ${folder}`);

  for (const file of files) {
    const sourcePath = path.join(folderPath, file);

    // Skip directories and metadata files
    if (fs.statSync(sourcePath).isDirectory()) continue;
    if (file === '_metadata.json') continue;

    // Check if it's a bot file
    const ext = path.extname(file).toLowerCase();
    const botExtensions = ['.mq4', '.mq5', '.mqh', '.py', '.js', '.ts', '.pine', '.json'];

    if (!botExtensions.includes(ext)) {
      console.log(`   ⏭️  Skipping ${file} (not a bot file)`);
      totalSkipped++;
      continue;
    }

    // Create unique filename to avoid conflicts
    const repoName = folder.replace('harvest1_', '').replace('harvest2_', '')
                          .replace('harvest3_', '').replace('harvest4_', '')
                          .replace('harvest5_', '').replace(/_/g, '-');
    const newName = `${repoName}_${file}`;
    const destPath = path.join(INCOMING_PATH, newName);

    // Copy file (don't move, keep originals)
    try {
      fs.copyFileSync(sourcePath, destPath);
      console.log(`   ✅ ${file} -> ${newName}`);
      totalMoved++;
    } catch (err) {
      console.log(`   ❌ Failed to copy ${file}: ${err.message}`);
    }
  }
}

console.log('\n============================================================');
console.log(`PROCESSING COMPLETE!`);
console.log(`   Files copied: ${totalMoved}`);
console.log(`   Files skipped: ${totalSkipped}`);
console.log('============================================================');
console.log('\nThe Bot Drop Zone will now automatically detect and analyze');
console.log('these files. Check http://localhost:3001/api/v1/dropzone/pending');
console.log('to see processing status.\n');
