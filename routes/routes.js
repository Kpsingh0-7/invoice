// routes/index.js
import { Router } from 'express';
import { generateInvoice } from '../controllers/invoiceController.js';

const router = Router();
router.get("/invoice", generateInvoice);
export default router;
