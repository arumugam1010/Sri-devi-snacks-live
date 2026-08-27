const fs = require('fs');
const content = fs.readFileSync('frontend/src/components/Billing.tsx', 'utf8');
const lines = content.split(/\r?\n/);

const startIdx = lines.findIndex(l => l.includes('const handlePrintMultiple = ('));
const endIdx = lines.findIndex((l, i) => i > startIdx && l === '    };');

if (startIdx !== -1 && endIdx !== -1) {
    const printFuncLines = lines.slice(startIdx, endIdx + 1);
    let exportFunc = printFuncLines.join('\n')
        .replace('const handlePrintMultiple = (billIds: string[]) => {', 'const handleExportPDF = async (billIds: string[], monthName: string) => {\n    setIsExportingPDF(true);\n    try {')
        .replace('win.focus();', '')
        .replace('setTimeout(() => {', '')
        .replace('win.print();', '')
        .replace('}, 500);', '');

    // Now append the PDF generation part
    const pdfLogic = `
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.width = '1000px';
      iframe.style.height = '1000px';
      iframe.style.left = '-9999px';
      document.body.appendChild(iframe);
  
      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(htmlContent);
        doc.close();
  
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const pdf = new jsPDF('p', 'pt', 'a4');
        const elements = doc.querySelectorAll('.single-bill');
        
        for (let i = 0; i < elements.length; i++) {
          if (i > 0) pdf.addPage();
          const canvas = await html2canvas(elements[i], { scale: 1.5, useCORS: true });
          const imgData = canvas.toDataURL('image/jpeg', 0.9);
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
          pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        }
        
        pdf.save(\`Bills_\${monthName}.pdf\`);
        document.body.removeChild(iframe);
      }
    } catch (e: any) {
      console.error(e);
      alert('Failed to generate PDF. Too many bills to process in memory.');
    } finally {
      setIsExportingPDF(false);
    }
  };`;

    exportFunc = exportFunc.substring(0, exportFunc.lastIndexOf('win.document.close();') + 21) + pdfLogic;

    lines.splice(endIdx + 1, 0, exportFunc);
    fs.writeFileSync('frontend/src/components/Billing.tsx', lines.join('\n'));
    console.log("PDF function inserted successfully.");
} else {
    console.log("Could not find handlePrintMultiple function.");
}
