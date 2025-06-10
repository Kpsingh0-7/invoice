const express = require("express");
const axios = require("axios");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const app = express();
const PORT = 3000;

app.use(express.json());

// Helper function to generate PDF with a full-page table format
function generateInvoicePDF(invoice, filePath) {
  const doc = new PDFDocument({ margin: 30 });
  doc.pipe(fs.createWriteStream(filePath));

  // Font Paths for various languages
  const fontLatin = path.join(__dirname, "fonts", "NotoSans-Regular.ttf");
  const fontArabic = path.join(__dirname, "fonts", "NotoSansArabic-Regular.ttf");
  const fontChinese = path.join(__dirname, "fonts", "NotoSansCJK-Regular.ttc");
  const fontHindi = path.join(__dirname, "fonts", "NotoSansDevanagari-Regular.ttf");
  const fontGujarati = path.join(__dirname, "fonts", "NotoSansGujarati-Regular.ttf");

  // Header
  doc
    .font(fontLatin)
    .fontSize(20)
    .font("Helvetica-Bold")
    .text(invoice.order.shop_name || "", { align: "center" });
  doc
    .font(fontLatin)
    .fontSize(12)
    .text(invoice.order.shop_address || "", { align: "center" });
  doc
    .font(fontLatin)
    .fontSize(12)
    .text(`Invoice: ${invoice.pos_order_id || ""}`, { align: "center" });
  doc.text(`Date: ${invoice.order.trans_date || ""}`, { align: "center" });
  doc.moveDown();

  // Customer Info
  doc.font(fontLatin).fontSize(12).text(`Customer Name: ${invoice.order.user_name || "N/A"}`);
  doc.text(`Mobile: ${invoice.order.user_mobile || "N/A"}`);
  doc.text(`Email: ${invoice.order.Email_Id || "N/A"}`);
  doc.text(`Payment Method: ${invoice.order.payment_method || "N/A"}`);
  doc.text(`Delivery Method: ${invoice.order.delivery_method || "N/A"}`);
  doc.moveDown();

  // Items Table
  const tableMargin = 30;
  const tableWidth = doc.page.width - 2 * tableMargin;
  const columnWidths = [tableWidth * 0.4, tableWidth * 0.2, tableWidth * 0.2, tableWidth * 0.2];
  const rowHeight = 22;

  // Draw Items Table Header (Bold Headers)
  let yPosition = doc.y;
  doc.rect(tableMargin, yPosition, tableWidth, rowHeight).stroke();
  doc
    .font(fontLatin)
    .fontSize(12)
    .font("Helvetica-Bold")
    .text("Item Name", tableMargin + 5, yPosition + 5, { width: columnWidths[0], align: "center" })
    .text("Qty", tableMargin + columnWidths[0] + 5, yPosition + 5, { width: columnWidths[1], align: "center" })
    .text("Price", tableMargin + columnWidths[0] + columnWidths[1] + 5, yPosition + 5, { width: columnWidths[2], align: "center" })
    .text("Amount", tableMargin + columnWidths[0] + columnWidths[1] + columnWidths[2] + 5, yPosition + 5, { width: columnWidths[3], align: "center" });
  
// Draw vertical lines for the header
let currentX = tableMargin;
columnWidths.forEach((width) => {
  currentX += width;
  doc
    .moveTo(currentX, yPosition)
    .lineTo(currentX, yPosition + rowHeight)
    .stroke();
});

  yPosition += rowHeight;

  // Items Rows
  invoice.items.forEach((item) => {
    let fontToUse = fontLatin;
    if (/[\u0600-\u06FF]/.test(item.Item_Name)) fontToUse = fontArabic;
    else if (/[\u4e00-\u9fff]/.test(item.Item_Name)) fontToUse = fontChinese;
    else if (/[\u0900-\u097F]/.test(item.Item_Name)) fontToUse = fontHindi;
    else if (/[\u0A80-\u0AFF]/.test(item.Item_Name)) fontToUse = fontGujarati;

    doc.rect(tableMargin, yPosition, tableWidth, rowHeight).stroke();
    doc
      .font(fontToUse)
      .fontSize(12)
      .text(item.Item_Name || "N/A", tableMargin + 5, yPosition + 5, { width: columnWidths[0], align: "center" })
      .text(item.Quantity || "0", tableMargin + columnWidths[0] + 5, yPosition + 5, { width: columnWidths[1], align: "center" })
      .text(item.Single_Price || "0", tableMargin + columnWidths[0] + columnWidths[1] + 5, yPosition + 5, { width: columnWidths[2], align: "center" })
      .text(item.Amount || "0", tableMargin + columnWidths[0] + columnWidths[1] + columnWidths[2] + 5, yPosition + 5, { width: columnWidths[3], align: "center" });
    
    // Draw vertical lines for the row
    currentX = tableMargin;
    columnWidths.forEach((width) => {
      currentX += width;
      doc
        .moveTo(currentX, yPosition)
        .lineTo(currentX, yPosition + rowHeight)
        .stroke();
    });;

    yPosition += rowHeight;

    // Check for page break
    if (yPosition + rowHeight > doc.page.height - 100) {
      doc.addPage();
      yPosition = tableMargin;
    }
  });

  // Taxes Table (directly below Items Table)
  const taxTableWidth = tableWidth * 0.4; // Right-aligned table width
  const taxTableX = doc.page.width - tableMargin - taxTableWidth; // Align to the right

   // Draw Taxes Header (Bold Headers)
  doc.rect(taxTableX, yPosition, taxTableWidth, rowHeight).stroke();
  doc
    .font(fontLatin)
    .fontSize(12)
    .font("Helvetica-Bold")
    .text("Tax Name", taxTableX + 5, yPosition + 5, { width: taxTableWidth / 2, align: "center" })
    .text("Amount", taxTableX + taxTableWidth / 2 + 5, yPosition + 5, { width: taxTableWidth / 2, align: "center" });

    // Draw vertical line for header
  doc
  .moveTo(taxTableX + taxTableWidth / 2, yPosition)
  .lineTo(taxTableX + taxTableWidth / 2, yPosition + rowHeight)
  .stroke();

  yPosition += rowHeight;

  doc.rect(taxTableX, yPosition, taxTableWidth, rowHeight).stroke();
  doc
    .font(fontLatin)
    .fontSize(12)
    .font(fontLatin)
    .text("Sub Total", taxTableX + 5, yPosition + 5, { width: taxTableWidth / 2, align: "center" })
    .text(`${invoice.order.currency || ""} ${invoice.order.amount || "0"}`, taxTableX + taxTableWidth / 2 + 5, yPosition + 5, { width: taxTableWidth / 2, align: "center" });
  
    doc.moveTo(taxTableX + taxTableWidth / 2, yPosition)
    .lineTo(taxTableX + taxTableWidth / 2, yPosition + rowHeight)
    .stroke();
    yPosition += rowHeight;
    
    // Draw vertical lines for rows
    doc
    .moveTo(taxTableX + taxTableWidth / 2, yPosition)
    .lineTo(taxTableX + taxTableWidth / 2, yPosition + rowHeight)
    .stroke();

  // Draw Taxes Rows with vertical lines
  invoice.taxList.forEach((tax) => {
    doc.rect(taxTableX, yPosition, taxTableWidth, rowHeight).stroke();
    doc
      .font(fontLatin)
      .fontSize(11)
      .text(tax.tax_name || "N/A", taxTableX + 2 , yPosition + 5, { width: taxTableWidth / 2, })
      .text(tax.tax_amount || "0", taxTableX + taxTableWidth / 2 + 5, yPosition + 5, { width: taxTableWidth / 2, align: "center" });

      // Draw vertical lines for rows
    doc
    .moveTo(taxTableX + taxTableWidth / 2, yPosition)
    .lineTo(taxTableX + taxTableWidth / 2, yPosition + rowHeight)
    .stroke();

    yPosition += rowHeight;
  });

   // Total Row (Bold)
  doc.rect(taxTableX, yPosition, taxTableWidth, rowHeight).stroke();
  doc
    .font(fontLatin)
    .fontSize(12)
    .font("Helvetica-Bold")
    .text("Total", taxTableX + 5, yPosition + 5, { width: taxTableWidth / 2, align: "center" })
    .text(`${invoice.order.currency || ""} ${invoice.order.total_amount || "0"}`, taxTableX + taxTableWidth / 2 + 5, yPosition + 5, { width: taxTableWidth / 2, align: "center" });
    // Draw vertical lines for rows
    doc
    
  doc.end();
}


app.get("/invoice", async (req, res) => {
  try {
    const shopId = req.query.shop_id;
    const orderId = req.query.order_id;

    if (!shopId || !orderId) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    const api1Url = `https://www.foodchow.com/api/foodChowwd/getOrderedItemList`;
    const api2Url = `https://www.foodchow.com/api/foodChowRMS/getOrderDetailsByOderId`;

    //console.log(api1Url);

    const [response1, response2] = await Promise.all([
      axios.get(`${api1Url}?ShopId=${shopId}&order_id=${orderId}`),
      axios.get(`${api2Url}?shop_id=${shopId}&order_id=${orderId}`),
    ]);

    let invoiceData1 = response1.data?.result?.data
      ? JSON.parse(response1.data.result.data)[0] || {}
      : {};
    let invoiceData2 = response2.data?.data
      ? JSON.parse(response2.data.data)[0] || {}
      : {};

    const invoice = {
      pos_order_id:
        invoiceData1?.pos_order_id ||
        invoiceData2?.pos_order_id ||
        invoiceData1?.order_id ||
        invoiceData2?.order_id,
      order: {
        shop_name: invoiceData1?.Shop_Name || invoiceData2?.shop_name,
        shop_address:
          [
            invoiceData2?.shop_address,
            invoiceData2?.shop_area,
            invoiceData2?.shop_city,
            invoiceData2?.shop_state,
            invoiceData2?.shop_country,
          ]
            .filter(Boolean)
            .join(", ") || "N/A",
        shop_email: invoiceData2?.shop_email,
        user_name: invoiceData2?.name || invoiceData1?.UserModel?.Name,
        user_mobile:
          invoiceData2?.mobile_no || invoiceData1?.UserModel?.Mobile_No,
        Email_Id: invoiceData2?.Email_Id || invoiceData1?.UserModel?.Email_Id,
        delivery_method:
          invoiceData2?.delivery_method_name ||
          invoiceData1?.DeliveryModel?.Delivery_Method_Name,
        user_address: invoiceData2?.user_address || "N/A",
        trans_date: invoiceData2?.Trans_Date?.Value || invoiceData1?.Trans_Date,
        tax_reg_no:
          invoiceData2?.tax_reg_no || invoiceData1?.tax_reg_no || "N/A",
        amount: invoiceData1?.Amount || invoiceData2?.total_amount || 0,
        discount: invoiceData1?.Discount || invoiceData2?.discount || 0,
        charges: invoiceData1?.Charges || invoiceData2?.charges || 0,
        payment_charges: invoiceData1?.Payment_Charges || 0,
        total_amount:
          invoiceData1?.Total_Amount || invoiceData2?.total_amount || 0,
        payment_method:
          invoiceData1?.Payment_Method || invoiceData2?.payment_method,
      },
      items: invoiceData1?.OrderedItemList || [],
      taxList: invoiceData1?.OrderTaxList || [],
    };

   // console.log("Generated Invoice Data:", invoice);

    const filePath = path.join(__dirname, `invoice.pdf`);
    generateInvoicePDF(invoice, filePath);

    res.setHeader("Content-Type", "application/pdf");
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    console.error("Error fetching invoice data:", error);
    res
      .status(500)
      .json({ error: `Failed to fetch invoice data: ${error.message}` });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
