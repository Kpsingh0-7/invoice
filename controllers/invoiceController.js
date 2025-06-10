import axios from "axios";
import ejs from "ejs";
import path from "path";
import puppeteer from "puppeteer";


// async function generateInvoicePDF(htmlContent, filePath) {
//   const browser = await chromium.launch({ headless: true });
//   const page = await browser.newPage();
//   await page.setContent(htmlContent, { waitUntil: "load" });

//   await page.pdf({
//     path: filePath,
//     format: "A4",
//     printBackground: true,
//   });

//   await browser.close();
// }

async function generateInvoicePDF(htmlContent, filePath) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.setContent(htmlContent, { waitUntil: "networkidle0" });

  await page.pdf({
    path: filePath,
    format: "A4",
    printBackground: true,
  });

  await browser.close();
}

export const generateInvoice = async (req, res) => {
  try {
    const shopId = req.query.shop_id;
    const orderid = req.query.order_id;
    // URLs for both APIs
    const api1Url = process.env.API1_URL;
    const api2Url = process.env.API2_URL;
    // console.log(`${api1Url}?shop_id=${shopId}&order_id=${orderid}`);
    // console.log(`${api2Url}?ShopId=${shopId}&order_id=${orderid}`);
    // Fetch data from both APIs in parallel
    const [response1, response2] = await Promise.all([
      axios.get(`${api1Url}?ShopId=${shopId}&order_id=${orderid}`),
      axios.get(`${api2Url}?shop_id=${shopId}&order_id=${orderid}`),
    ]);

    // // Log API responses for debugging
     // console.log("API 1 Response:", response1.data);
    // console.log("API 2 Response:", response2.data);

    // Parse API 1 response
    let invoiceData1;
    if (
      !response1.data ||
      !response1.data.result ||
      !response1.data.result.data
    ) {
      throw new Error("Invalid API 1 response structure");
    }
    try {
      invoiceData1 = JSON.parse(response1.data.result.data);
    } catch (parseError) {
      console.error(
        "Invalid JSON in API 1 response:",
        response1.data.result.data
      );
      throw new Error("Failed to parse invoice data from API 1");
    }
    if (!Array.isArray(invoiceData1) || invoiceData1.length === 0) {
      throw new Error("No Data Found");
    }
    const rawInvoiceData1 = invoiceData1[0];

    // Parse API 2 response
    let invoiceData2;
    if (!response2.data || !response2.data.data) {
      throw new Error("Invalid API 2 response structure");
    } 
    try {
      invoiceData2 = JSON.parse(response2.data.data); // Parse the stringified JSON
    } catch (parseError) {
      console.error("Invalid JSON in API 2 response:", response2.data.data);
      throw new Error("Failed to parse invoice data from API 2");
    }
    if (!Array.isArray(invoiceData2) || invoiceData2.length === 0) {
      throw new Error("No Data Found");
    }
    const rawInvoiceData2 = invoiceData2[0];

    // Combine data from both APIs into a single object
    const invoice = {
      order_id: rawInvoiceData1?.Order_Id || rawInvoiceData2?.order_id,
      order: {
        shop_name:
          rawInvoiceData1?.Shop_Name ||
          rawInvoiceData2?.shop_name ||
          "Food Shop",
        shop_address:
          [
            rawInvoiceData2?.shop_address,
            rawInvoiceData2?.shop_area,
            rawInvoiceData2?.shop_city,
            rawInvoiceData2?.shop_state,
            rawInvoiceData2?.shop_country,
          ]
            .filter(Boolean)
            .join(", ") || "N/A",

        shop_email: rawInvoiceData2?.shop_email,
        user_name: rawInvoiceData2?.name || rawInvoiceData1?.UserModel?.Name,
        user_mobile:
          rawInvoiceData2?.mobile_no || rawInvoiceData1?.UserModel?.Mobile_No,
        delivery_method:
          rawInvoiceData2?.delivery_method_name ||
          rawInvoiceData1?.DeliveryModel?.Delivery_Method_Name,
        user_address: rawInvoiceData2?.user_address,
        Order_DeliveryPickup_Time:
          rawInvoiceData2?.Order_DeliveryPickup_Time?.Value ||
          rawInvoiceData1?.Order_DeliveryPickup_Time,
        trans_date:
          rawInvoiceData2?.trans_date?.Value || rawInvoiceData1?.Trans_Date,
        tax_reg_no: rawInvoiceData2?.tax_reg_no || rawInvoiceData1?.tax_reg_no,
        amount: rawInvoiceData1?.Amount || rawInvoiceData2?.total_amount || 0,
        discount: rawInvoiceData1?.Discount || rawInvoiceData2?.discount || 0,
        charges: rawInvoiceData1?.Charges || rawInvoiceData2?.charges || 0,
        payment_charges: rawInvoiceData1?.Payment_Charges,
        total_amount:
          rawInvoiceData1?.Total_Amount || rawInvoiceData2?.total_amount || 0,
        payment_method:
          rawInvoiceData1?.Payment_Method || rawInvoiceData2?.payment_method,
        order_paid_status: rawInvoiceData2?.order_paid_status,
      },
      items: rawInvoiceData1?.OrderedItemList || [],
      taxList: rawInvoiceData1?.OrderTaxList || [],
    };

    //console.log("Combined Invoice Data:", invoice); // Debugging

    // Render HTML using EJS template
    const __dirname = path.resolve();
    const htmlContent = await ejs.renderFile(
      path.join(__dirname, "views", "invoice.ejs"),
      { invoice }
    );

    // Generate PDF
    const filePath = path.join(__dirname, "invoice.pdf");
    await generateInvoicePDF(htmlContent, filePath);

    // Serve the generated PDF
    res.setHeader("Content-Type", "application/pdf");
    res.sendFile(filePath);
    console.log("Invoice is ready!");
  } catch (error) {
    console.error("Error fetching invoice data:", error.message);
    res.status(500).send(`Failed to fetch invoice data: ${error.message}`);
  }
}
