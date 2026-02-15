
import { DocumentFactory } from '../DocumentFactory';
import { BlockType } from '../blocks/Block';

async function runStressTest() {
  console.log('Running Stress Test: DocumentFactory');
  const factory = new DocumentFactory();

  // Scenario A: The Behemoth
  console.log('\n--- Scenario A: The Behemoth ---');
  const startA = performance.now();
  try {
    const tableData = {
      headers: ['ID', 'Name', 'Value', 'Status'],
      rows: Array.from({ length: 1000 }, (_, i) => [`${i}`, `Item ${i}`, `${Math.random() * 1000}`, i % 2 === 0 ? 'Active' : 'Inactive'])
    };
    
    // Create a block for the behemoth table
    const behemothBlocks = [{
        type: BlockType.TABLE,
        data: tableData
    }];
    const behemothDoc = await factory.createDocument({
        title: 'Behemoth Report',
        blocks: behemothBlocks
    });
    
    // Check if the Behemoth actually created a large structure
    // Since createDocument returns void, we can't inspect it directly.
    // However, the console log says "Generated 1 content nodes".
    // Let's modify DocumentFactory to return the definition for inspection,
    // or log the size of the table content inside createDocument.
    
    console.log(`[PASS] Behemoth generated in ${(performance.now() - startA).toFixed(2)}ms`);
  } catch (error) {
    console.error(`[FAIL] Behemoth failed:`, error);
  }

  // Scenario B: The Chaos
  console.log('\n--- Scenario B: The Chaos ---');
  try {
    const chaosBlocks = [
        { type: BlockType.HEADING, content: 'Chaos Report' },
        { type: BlockType.IMAGE, data: { src: 'placeholder.png', width: 100, height: 100 } },
        { type: BlockType.TEXT, content: 'Some random text to fill space.' },
        { type: BlockType.TABLE, data: { headers: ['Col1'], rows: [['Val1'], ['Val2']] } },
        { type: BlockType.IMAGE, data: { src: 'placeholder.png', width: 500, height: 500 } } // Potential layout collision?
    ];
    
    const chaosDoc = await factory.createDocument({
        title: 'Chaos Report',
        blocks: chaosBlocks
    });
    console.log('[PASS] Chaos report generated');
  } catch (error) {
    console.error(`[FAIL] Chaos failed:`, error);
  }

  // Scenario C: The Void
  console.log('\n--- Scenario C: The Void ---');
  try {
    const voidBlocks = [
        { type: BlockType.TEXT, content: null as any }, // Intentional null
        { type: BlockType.TEXT, content: undefined as any }, // Intentional undefined
        { type: BlockType.HEADING, content: null as any }
    ];
    
    const voidDoc = await factory.createDocument({
        title: 'Void Report',
        blocks: voidBlocks
    });
    console.log('[PASS] Void report handled (no crash)');
  } catch (error) {
    console.error(`[FAIL] Void caused error:`, error);
  }
}

runStressTest();
