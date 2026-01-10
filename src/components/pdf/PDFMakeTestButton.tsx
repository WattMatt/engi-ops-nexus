/**
 * PDFMake Test Button
 * 
 * A development utility component to test and verify pdfmake utilities.
 * This can be used to validate the migration before updating production components.
 */

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { FileDown, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  createDocument,
  heading,
  paragraph,
  keyValue,
  sectionHeader,
  dataTable,
  infoTable,
  spacer,
  horizontalLine,
  pageBreak,
  formatCurrency,
  formatDate,
  fetchCompanyDetails,
  generateCoverPageContent,
  validateDocument,
  testPDFGeneration,
  PDF_COLORS,
  type TableColumn,
} from "@/utils/pdfmake";

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  time?: number;
}

export const PDFMakeTestButton = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  const runTests = async () => {
    setLoading(true);
    setResults([]);
    const testResults: TestResult[] = [];

    try {
      // Test 1: Basic document creation
      const startTime1 = performance.now();
      try {
        const doc = createDocument()
          .add(heading('Test Document'))
          .add(paragraph('This is a test paragraph.'));
        
        const def = doc.build();
        testResults.push({
          name: 'Basic Document Creation',
          passed: Array.isArray(def.content) && def.content.length > 0,
          message: `Created document with ${Array.isArray(def.content) ? def.content.length : 0} content items`,
          time: Math.round(performance.now() - startTime1)
        });
      } catch (e) {
        testResults.push({
          name: 'Basic Document Creation',
          passed: false,
          message: `Error: ${e instanceof Error ? e.message : 'Unknown error'}`
        });
      }

      // Test 2: Content primitives
      const startTime2 = performance.now();
      try {
        const h1 = heading('Heading 1', 1);
        const h2 = heading('Heading 2', 2);
        const h3 = heading('Heading 3', 3);
        const p = paragraph('Test paragraph');
        const kv = keyValue('Key', 'Value');
        const sh = sectionHeader('Section');
        const sp = spacer(10);
        const hl = horizontalLine();
        const pb = pageBreak();

        testResults.push({
          name: 'Content Primitives',
          passed: true,
          message: 'All primitives created successfully',
          time: Math.round(performance.now() - startTime2)
        });
      } catch (e) {
        testResults.push({
          name: 'Content Primitives',
          passed: false,
          message: `Error: ${e instanceof Error ? e.message : 'Unknown error'}`
        });
      }

      // Test 3: Data table
      const startTime3 = performance.now();
      try {
        const columns: TableColumn[] = [
          { field: 'name', header: 'Name', width: '*' },
          { field: 'value', header: 'Value', width: 100 }
        ];
        const data = [
          { name: 'Item 1', value: 100 },
          { name: 'Item 2', value: 200 }
        ];
        const table = dataTable(columns, data);

        testResults.push({
          name: 'Data Table',
          passed: table !== null && typeof table === 'object',
          message: 'Table created with 2 rows',
          time: Math.round(performance.now() - startTime3)
        });
      } catch (e) {
        testResults.push({
          name: 'Data Table',
          passed: false,
          message: `Error: ${e instanceof Error ? e.message : 'Unknown error'}`
        });
      }

      // Test 4: Info table
      const startTime4 = performance.now();
      try {
        const info = infoTable([
          { label: 'Project', value: 'Test Project' },
          { label: 'Date', value: '2024-01-15' }
        ]);

        testResults.push({
          name: 'Info Table',
          passed: info !== null && typeof info === 'object',
          message: 'Info table created with 2 rows',
          time: Math.round(performance.now() - startTime4)
        });
      } catch (e) {
        testResults.push({
          name: 'Info Table',
          passed: false,
          message: `Error: ${e instanceof Error ? e.message : 'Unknown error'}`
        });
      }

      // Test 5: Formatting utilities
      const startTime5 = performance.now();
      try {
        const currency = formatCurrency(1234.56);
        const date = formatDate(new Date());
        
        testResults.push({
          name: 'Formatting Utilities',
          passed: currency.includes('1') && date.length > 0,
          message: `Currency: ${currency}, Date: ${date}`,
          time: Math.round(performance.now() - startTime5)
        });
      } catch (e) {
        testResults.push({
          name: 'Formatting Utilities',
          passed: false,
          message: `Error: ${e instanceof Error ? e.message : 'Unknown error'}`
        });
      }

      // Test 6: Document validation
      const startTime6 = performance.now();
      try {
        const doc = createDocument()
          .add(heading('Validation Test'))
          .add(paragraph('Testing validation...'));
        
        const validation = validateDocument(doc.build());

        testResults.push({
          name: 'Document Validation',
          passed: validation.valid,
          message: validation.valid 
            ? 'Document is valid' 
            : `Errors: ${validation.errors.map(e => e.message).join(', ')}`,
          time: Math.round(performance.now() - startTime6)
        });
      } catch (e) {
        testResults.push({
          name: 'Document Validation',
          passed: false,
          message: `Error: ${e instanceof Error ? e.message : 'Unknown error'}`
        });
      }

      // Test 7: Headers and footers
      const startTime7 = performance.now();
      try {
        const doc = createDocument()
          .add(heading('Headers Test'))
          .withStandardHeader('Test Report', 'Test Project')
          .withStandardFooter();
        
        const def = doc.build();

        testResults.push({
          name: 'Headers & Footers',
          passed: def.header !== undefined && def.footer !== undefined,
          message: 'Headers and footers configured',
          time: Math.round(performance.now() - startTime7)
        });
      } catch (e) {
        testResults.push({
          name: 'Headers & Footers',
          passed: false,
          message: `Error: ${e instanceof Error ? e.message : 'Unknown error'}`
        });
      }

      // Test 8: PDF generation
      const startTime8 = performance.now();
      try {
        const columns: TableColumn[] = [
          { field: 'item', header: 'Item', width: '*' },
          { field: 'amount', header: 'Amount', width: 100, align: 'right' }
        ];
        
        const doc = createDocument()
          .add(heading('Generation Test'))
          .add(paragraph('This PDF was generated to test the pdfmake utilities.'))
          .add(spacer(10))
          .add(dataTable(
            columns,
            [
              { item: 'Test Item 1', amount: formatCurrency(1000) },
              { item: 'Test Item 2', amount: formatCurrency(2500) },
              { item: 'Total', amount: formatCurrency(3500) }
            ]
          ))
          .withStandardFooter();

        const result = await testPDFGeneration(doc.build());

        testResults.push({
          name: 'PDF Generation',
          passed: result.success,
          message: result.success 
            ? `Generated in ${result.generationTime?.toFixed(0)}ms, size: ${Math.round((result.blobSize || 0) / 1024)}KB`
            : `Error: ${result.error}`,
          time: result.generationTime ? Math.round(result.generationTime) : undefined
        });
      } catch (e) {
        testResults.push({
          name: 'PDF Generation',
          passed: false,
          message: `Error: ${e instanceof Error ? e.message : 'Unknown error'}`
        });
      }

      // Test 9: Cover page (optional, depends on company details)
      const startTime9 = performance.now();
      try {
        const companyDetails = await fetchCompanyDetails();
        const coverContent = await generateCoverPageContent(
          {
            title: 'Test Report',
            projectName: 'Test Project',
            revision: 'Rev. 1.0'
          },
          companyDetails
        );

        testResults.push({
          name: 'Cover Page',
          passed: Array.isArray(coverContent) && coverContent.length > 0,
          message: `Cover page content generated with ${coverContent.length} elements`,
          time: Math.round(performance.now() - startTime9)
        });
      } catch (e) {
        testResults.push({
          name: 'Cover Page',
          passed: false,
          message: `Error: ${e instanceof Error ? e.message : 'Unknown error'}`
        });
      }

      setResults(testResults);
      setShowResults(true);

      const passed = testResults.filter(r => r.passed).length;
      const total = testResults.length;
      
      if (passed === total) {
        toast.success(`All ${total} tests passed!`);
      } else {
        toast.warning(`${passed}/${total} tests passed`);
      }

    } catch (error) {
      console.error('Test suite error:', error);
      toast.error('Test suite failed');
    } finally {
      setLoading(false);
    }
  };

  const downloadSamplePDF = async () => {
    setLoading(true);
    try {
      const companyDetails = await fetchCompanyDetails();
      
      const columns: TableColumn[] = [
        { field: 'category', header: 'Category', width: '*' },
        { field: 'items', header: 'Items', width: 80, align: 'center' },
        { field: 'amount', header: 'Amount', width: 100, align: 'right' }
      ];
      
      const doc = createDocument()
        // Cover page
        .add(await generateCoverPageContent(
          {
            title: 'Sample PDF Report',
            projectName: 'pdfmake Migration Test',
            revision: 'Rev. 1.0',
            subtitle: 'Generated by PDFMake Test Utility'
          },
          companyDetails
        ))
        
        // Executive Summary
        .add(sectionHeader('Executive Summary'))
        .add(paragraph('This is a sample PDF document generated using the new pdfmake utilities. It demonstrates various content types and formatting options available in the system.'))
        .add(spacer(15))
        
        // Key Information
        .add(sectionHeader('Project Information'))
        .add(infoTable([
          { label: 'Project Name', value: 'pdfmake Migration Test' },
          { label: 'Document Type', value: 'Sample Report' },
          { label: 'Generated Date', value: formatDate(new Date()) },
          { label: 'Status', value: 'Complete' }
        ]))
        .add(spacer(15))
        
        // Data Table
        .add(sectionHeader('Sample Data'))
        .add(paragraph('The following table demonstrates the data table functionality:'))
        .add(spacer(10))
        .add(dataTable(
          columns,
          [
            { category: 'Electrical', items: 25, amount: formatCurrency(45000) },
            { category: 'Mechanical', items: 18, amount: formatCurrency(32000) },
            { category: 'Civil', items: 12, amount: formatCurrency(28000) },
            { category: 'Finishes', items: 35, amount: formatCurrency(55000) },
            { category: 'Total', items: 90, amount: formatCurrency(160000) }
          ]
        ))
        .add(spacer(15))
        
        // Key-Value pairs
        .add(sectionHeader('Summary Statistics'))
        .add(keyValue('Total Items', '90'))
        .add(keyValue('Total Value', formatCurrency(160000)))
        .add(keyValue('Average Item Value', formatCurrency(1777.78)))
        .add(spacer(15))
        
        // Footer note
        .add(horizontalLine())
        .add(spacer(5))
        .add(paragraph('This document was automatically generated using pdfmake utilities.'))
        
        // Add headers and footers
        .withStandardHeader('Sample PDF Report', 'pdfmake Migration Test')
        .withStandardFooter();

      doc.download('pdfmake-sample-report.pdf');
      toast.success('Sample PDF downloaded successfully!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to generate sample PDF');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={runTests}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4 mr-2" />
          )}
          Run Tests
        </Button>
        
        <Button 
          variant="default" 
          size="sm" 
          onClick={downloadSamplePDF}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <FileDown className="h-4 w-4 mr-2" />
          )}
          Download Sample PDF
        </Button>
      </div>

      {showResults && results.length > 0 && (
        <div className="border rounded-lg p-4 bg-muted/30">
          <h4 className="font-medium mb-3">Test Results</h4>
          <div className="space-y-2">
            {results.map((result, index) => (
              <div 
                key={index}
                className={`flex items-start gap-2 text-sm p-2 rounded ${
                  result.passed ? 'bg-green-50 dark:bg-green-950/30' : 'bg-red-50 dark:bg-red-950/30'
                }`}
              >
                {result.passed ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <div className="font-medium">{result.name}</div>
                  <div className="text-muted-foreground text-xs">{result.message}</div>
                </div>
                {result.time !== undefined && (
                  <div className="text-xs text-muted-foreground">{result.time}ms</div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t text-sm">
            <span className="font-medium">
              {results.filter(r => r.passed).length}/{results.length} tests passed
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PDFMakeTestButton;
