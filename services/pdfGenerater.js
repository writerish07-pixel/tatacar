import puppeteer from "puppeteer";
import path from "path";
import { fileURLToPath } from "url";
import { serviceAccountAuth } from "../services/googleSecurityHeader.js";
import { google } from "googleapis";
import generateRandomId from '../mixins/randomID.js';
import { Readable } from "stream";
import fs from "fs/promises";
import generateWhatsAppLink from "./sendWhatsApp.js";
import Handlebars from "handlebars";

Handlebars.registerHelper("ifCond", function (v1, operator, v2, options) {
  switch (operator) {
    case "==": return v1 == v2 ? options.fn(this) : options.inverse(this);
    case "===": return v1 === v2 ? options.fn(this) : options.inverse(this);
    case "!=": return v1 != v2 ? options.fn(this) : options.inverse(this);
    case "!==": return v1 !== v2 ? options.fn(this) : options.inverse(this);
    case "<": return v1 < v2 ? options.fn(this) : options.inverse(this);
    case "<=": return v1 <= v2 ? options.fn(this) : options.inverse(this);
    case ">": return v1 > v2 ? options.fn(this) : options.inverse(this);
    case ">=": return v1 >= v2 ? options.fn(this) : options.inverse(this);
    case "&&": return v1 && v2 ? options.fn(this) : options.inverse(this);
    case "||": return v1 || v2 ? options.fn(this) : options.inverse(this);
    default: return options.inverse(this);
  }
});

let newPage;
const getPage = async () => {
  if (newPage) return newPage;
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  newPage = await browser.newPage();
  return newPage;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let htmlTemplate;
try {
  htmlTemplate = await fs.readFile(path.join(__dirname, "template.html"), "utf8");
} catch (err) {
  htmlTemplate = '<html><body><h1>Quotation</h1><p>Template not found</p></body></html>';
  console.warn('Warning: template.html not found in services directory. PDF generation will use fallback template.');
}

const QUOTATION_FOLDER_ID = process.env.QUOTATION_FOLDER_ID || "1jsoZz9jDWXMVvL4AIphGok1A7mhKfYET";
const SPREADSHEET_ID = process.env.QUOTE_SHEET_ID;
const SHEET_NAME = "QuotationSheet";

const flattenJSON = (obj, prefix = '') => {
  return Object.keys(obj).reduce((acc, key) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      Object.assign(acc, flattenJSON(obj[key], fullKey));
    } else {
      acc[fullKey] = obj[key];
    }
    return acc;
  }, {});
};

const appendToSheet = async (data) => {
  try {
    const drive = google.drive({ version: "v3", auth: serviceAccountAuth });
    const sheets = google.sheets({ version: "v4", auth: serviceAccountAuth });
    const flatData = flattenJSON(data);
    const values = [Object.values(flatData)];
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A1`,
      valueInputOption: 'RAW',
      resource: { values },
    });
  } catch (error) {
    console.error('Error appending to sheet:', error.message);
  }
};

const uploadToDrive = async (pdfBuffer, fileName) => {
  const drive = google.drive({ version: "v3", auth: serviceAccountAuth });
  const fileMetadata = {
    name: fileName,
    parents: [QUOTATION_FOLDER_ID],
  };
  const media = {
    mimeType: 'application/pdf',
    body: Readable.from(pdfBuffer),
  };
  const file = await drive.files.create({
    resource: fileMetadata,
    media,
    fields: 'id',
  });
  return file.data.id;
};

const makeFilePublic = async (fileId) => {
  const drive = google.drive({ version: "v3", auth: serviceAccountAuth });
  await drive.permissions.create({
    fileId,
    resource: { role: 'reader', type: 'anyone' },
  });
  return `https://drive.google.com/file/d/${fileId}/view`;
};

const generatePDFBuffer = async (htmlContent) => {
  const page = await getPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  return page.pdf({ format: 'A4', printBackground: true });
};

const generatePDF = async (data) => {
  try {
    const date = new Date().toISOString().split('T')[0];
    const quotationId = generateRandomId(data.name || 'customer', data.mobile || '0000000000', date);

    const template = Handlebars.compile(htmlTemplate);
    const htmlContent = template({ ...data, quotationId, date });

    const pdfBuffer = await generatePDFBuffer(htmlContent);
    const fileName = `Quotation_${quotationId}.pdf`;

    const fileId = await uploadToDrive(pdfBuffer, fileName);
    const fileUrl = await makeFilePublic(fileId);

    await appendToSheet({ ...data, quotationId, date, fileUrl });

    const whatsappLink = generateWhatsAppLink({ ...data, fileUrl });

    return { quotationId, fileUrl, whatsappLink };
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

export default generatePDF;
