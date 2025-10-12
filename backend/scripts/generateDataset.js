#!/usr/bin/env node

/**
 * CLI script to generate wallet dataset for testing and validation
 * 
 * Usage:
 *   node scripts/generateDataset.js [count] [format]
 * 
 * Examples:
 *   node scripts/generateDataset.js 1000 json
 *   node scripts/generateDataset.js 5000 csv
 *   node scripts/generateDataset.js (uses defaults: 1000 json)
 */

import { generateDataset, saveDataset, exportToCSV } from '../services/datasetGenerator.js';

async function main() {
  const args = process.argv.slice(2);
  
  const count = parseInt(args[0]) || 1000;
  const format = args[1]?.toLowerCase() || 'json';
  
  console.log('═══════════════════════════════════════════════════');
  console.log('🏦 LoanVerse Dataset Generator');
  console.log('═══════════════════════════════════════════════════');
  console.log(`📊 Generating ${count} wallet entries in ${format.toUpperCase()} format...`);
  console.log('');
  
  try {
    // Generate dataset
    const startTime = Date.now();
    const datasetResult = await generateDataset(count);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('📈 Generation Statistics');
    console.log('═══════════════════════════════════════════════════');
    console.log(`Total Wallets: ${datasetResult.statistics.totalWallets}`);
    console.log(`Generation Time: ${duration}s`);
    console.log('');
    console.log('Credit Score Distribution:');
    console.log(`  Excellent (750-850): ${datasetResult.statistics.creditScoreDistribution.excellent}`);
    console.log(`  Good (650-749):      ${datasetResult.statistics.creditScoreDistribution.good}`);
    console.log(`  Fair (550-649):      ${datasetResult.statistics.creditScoreDistribution.fair}`);
    console.log(`  Poor (450-549):      ${datasetResult.statistics.creditScoreDistribution.poor}`);
    console.log(`  Very Poor (300-449): ${datasetResult.statistics.creditScoreDistribution.veryPoor}`);
    console.log('');
    console.log('Risk Profile Distribution:');
    console.log(`  Low Risk:    ${datasetResult.statistics.riskProfileDistribution.low}`);
    console.log(`  Medium Risk: ${datasetResult.statistics.riskProfileDistribution.medium}`);
    console.log(`  High Risk:   ${datasetResult.statistics.riskProfileDistribution.high}`);
    console.log('');
    console.log(`Average Credit Score: ${datasetResult.statistics.averageCreditScore}`);
    console.log('');
    
    // Save to file
    let filepath;
    if (format === 'csv') {
      filepath = await exportToCSV(datasetResult);
    } else {
      filepath = await saveDataset(datasetResult);
    }
    
    console.log('═══════════════════════════════════════════════════');
    console.log('✅ Dataset Generated Successfully!');
    console.log('═══════════════════════════════════════════════════');
    console.log(`📁 Saved to: ${filepath}`);
    console.log('');
    
    // Display sample entries
    console.log('Sample Entries (first 5):');
    console.log('');
    datasetResult.dataset.slice(0, 5).forEach((wallet, index) => {
      console.log(`${index + 1}. ${wallet.walletAddress}`);
      console.log(`   Credit Score: ${wallet.creditScore} | Risk: ${wallet.riskProfile}`);
      console.log(`   Tx Count: ${wallet.transactionAnalysis.txCount} | Volume: ${wallet.transactionAnalysis.totalVolume} ETH`);
      console.log(`   Repayment Rate: ${(wallet.lendingHistory.repaymentRate * 100).toFixed(1)}% | Protocols: ${wallet.defiBehavior.protocolCount}`);
      console.log('');
    });
    
    console.log('═══════════════════════════════════════════════════');
    
  } catch (error) {
    console.error('❌ Error generating dataset:', error);
    process.exit(1);
  }
}

main();
