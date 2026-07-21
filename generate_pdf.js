const fs = require('fs');
const puppeteer = require('puppeteer');
const marked = require('marked');

(async () => {
    // Read markdown
    const md = fs.readFileSync('RailPath_Intern_report.md', 'utf-8');
    
    // Customize marked to parse headings correctly
    const htmlContent = marked.parse(md);
    
    // Inject CSS for exact academic report formatting
    const finalHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            @page { margin: 1in; }
            body {
                font-family: 'Times New Roman', Times, serif;
                font-size: 12pt;
                line-height: 1.5;
                text-align: justify;
                color: #000;
            }
            h1 {
                font-size: 16pt;
                text-align: center;
                font-weight: bold;
                margin-bottom: 24pt;
                text-transform: uppercase;
            }
            h2 {
                font-size: 14pt;
                font-weight: bold;
                margin-top: 24pt;
                margin-bottom: 12pt;
                text-transform: uppercase;
            }
            h3, h4, h5, h6 {
                font-size: 12pt;
                font-weight: bold;
                margin-top: 12pt;
                margin-bottom: 6pt;
                text-transform: uppercase;
            }
            p {
                margin: 0 0 12pt 0;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 24pt;
                margin-top: 12pt;
            }
            th, td {
                border: 1px solid #000;
                padding: 10px;
                text-align: left;
                vertical-align: top;
            }
            th {
                background-color: #f2f2f2;
                font-weight: bold;
                text-transform: uppercase;
            }
            hr {
                border: none;
                border-top: 1px solid #000;
                margin: 24pt 0;
            }
            .page-break { page-break-after: always; }
        </style>
    </head>
    <body>
        ${htmlContent}
    </body>
    </html>
    `;

    // Launch puppeteer
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    await page.setContent(finalHtml, { waitUntil: 'networkidle0' });
    
    await page.pdf({
        path: 'RailPath_Intern_report.pdf',
        format: 'A4',
        displayHeaderFooter: true,
        headerTemplate: '<div></div>',
        footerTemplate: '<div style="font-size: 10pt; text-align: center; width: 100%; font-family: \'Times New Roman\';"><span class="pageNumber"></span></div>',
        margin: {
            top: '1in',
            bottom: '1in',
            right: '1in',
            left: '1in',
        }
    });

    await browser.close();
    console.log("PDF generation successful.");
})();
