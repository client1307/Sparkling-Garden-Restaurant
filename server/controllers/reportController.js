const Order = require('../models/Order');
const PDFDocument = require('pdfkit');
const { Parser } = require('json2csv');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

// Helper: Locate Restaurant Logo on Server
const getLogoPath = () => {
    const candidates = [
        path.join(__dirname, '../assets/sparkling-logo-dark.png'),
        path.join(__dirname, '../../public/images/sparkling-logo-dark.png'),
        path.join(process.cwd(), 'server/assets/sparkling-logo-dark.png'),
        path.join(process.cwd(), 'public/images/sparkling-logo-dark.png')
    ];
    for (const p of candidates) {
        if (fs.existsSync(p)) return p;
    }
    return null;
};

// Helper: India Standard Time (IST, UTC+5:30) Date & Time formatters
const formatISTDateTime = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
};

const formatISTDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
};

const formatISTTime = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
};

// Parse date range in Indian Standard Time (IST)
const parseISTRange = (startStr, endStr) => {
    let start, end;
    if (startStr) {
        start = new Date(`${startStr}T00:00:00.000+05:30`);
        if (isNaN(start.getTime())) {
            start = new Date(startStr);
            start.setHours(0, 0, 0, 0);
        }
    } else {
        start = new Date();
        start.setHours(0, 0, 0, 0);
    }

    if (endStr) {
        end = new Date(`${endStr}T23:59:59.999+05:30`);
        if (isNaN(end.getTime())) {
            end = new Date(endStr);
            end.setHours(23, 59, 59, 999);
        }
    } else {
        end = new Date();
        end.setHours(23, 59, 59, 999);
    }
    return { start, end };
};

// @desc    Generate Daily Report (PDF)
// @route   GET /api/reports/daily?date=YYYY-MM-DD
const generateDailyReport = async (req, res) => {
    try {
        const { start, end } = parseISTRange(req.query.date, req.query.date);

        const orders = await Order.find({
            createdAt: { $gte: start, $lte: end },
            status: { $ne: 'Cancelled' }
        }).sort({ createdAt: 1 });

        const totalRevenue = orders.reduce((sum, order) => sum + (Number(order.totalAmount) || 0), 0);
        const totalItems = orders.reduce((sum, order) => sum + order.items.reduce((iSum, i) => iSum + (Number(i.quantity) || 0), 0), 0);

        const doc = new PDFDocument({ margin: 45, size: 'A4' });
        const dateFileName = formatISTDate(start).replace(/\s+/g, '-');
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=sparkling-daily-report-${dateFileName}.pdf`);
        doc.pipe(res);

        // Header with Logo
        const logoPath = getLogoPath();
        let topY = 40;
        if (logoPath) {
            try {
                doc.image(logoPath, 45, topY, { width: 70 });
            } catch (err) {
                console.error("Logo load error:", err);
            }
        }

        doc.fontSize(18).font('Helvetica-Bold').fillColor('#222222').text('The Sparkling Garden Restaurant', 125, topY);
        doc.fontSize(9.5).font('Helvetica').fillColor('#555555').text('100% Pure Veg Fine Dining · Deesa, Gujarat', 125, topY + 20);
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#5A724A').text('Daily Sales & Performance Report', 125, topY + 34);
        doc.fontSize(8.5).font('Helvetica').fillColor('#777777').text(`Report Date: ${formatISTDate(start)}  |  Printed: ${formatISTDateTime(new Date())} (IST)`, 125, topY + 48);

        doc.moveTo(45, topY + 65).lineTo(550, topY + 65).strokeColor('#EBEBEB').stroke();

        // Summary Box
        doc.roundedRect(45, topY + 75, 505, 45, 8).fillAndStroke('#F4F6F0', '#BCE2A3');
        doc.fillColor('#222222').fontSize(9).font('Helvetica-Bold');
        doc.text('TOTAL ORDERS', 65, topY + 84);
        doc.text('ITEMS PREPARED', 195, topY + 84);
        doc.text('AVG ORDER VALUE', 335, topY + 84);
        doc.text('TOTAL REVENUE (IST)', 445, topY + 84);

        doc.fontSize(12).fillColor('#5A724A').font('Helvetica-Bold');
        doc.text(`${orders.length}`, 65, topY + 98);
        doc.text(`${totalItems}`, 195, topY + 98);
        doc.text(`INR ${orders.length > 0 ? (totalRevenue / orders.length).toFixed(2) : '0.00'}`, 335, topY + 98);
        doc.text(`INR ${totalRevenue.toFixed(2)}`, 445, topY + 98);

        // Orders Table
        let currentY = topY + 135;
        doc.fillColor('#222222').fontSize(11).font('Helvetica-Bold').text('Detailed Order Breakdown', 45, currentY);
        currentY += 16;

        doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#666666');
        doc.text('Time (IST)', 45, currentY);
        doc.text('Table', 135, currentY);
        doc.text('Order ID', 195, currentY);
        doc.text('Items Summary', 275, currentY);
        doc.text('Status', 420, currentY);
        doc.text('Total (INR)', 480, currentY, { width: 70, align: 'right' });

        doc.moveTo(45, currentY + 12).lineTo(550, currentY + 12).strokeColor('#222222').stroke();
        currentY += 18;

        doc.font('Helvetica').fontSize(8).fillColor('#222222');

        orders.forEach((order, index) => {
            const timeStr = formatISTTime(order.createdAt);
            const itemCount = order.items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);

            if (currentY > 740) {
                doc.addPage();
                currentY = 45;
                doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#666666');
                doc.text('Time (IST)', 45, currentY);
                doc.text('Table', 135, currentY);
                doc.text('Order ID', 195, currentY);
                doc.text('Items Summary', 275, currentY);
                doc.text('Status', 420, currentY);
                doc.text('Total (INR)', 480, currentY, { width: 70, align: 'right' });
                doc.moveTo(45, currentY + 12).lineTo(550, currentY + 12).strokeColor('#222222').stroke();
                currentY += 18;
                doc.font('Helvetica').fontSize(8).fillColor('#222222');
            }

            if (index % 2 === 0) {
                doc.rect(45, currentY - 2, 505, 15).fill('#FAFAFA');
                doc.fillColor('#222222');
            }

            doc.text(timeStr, 47, currentY);
            doc.text(`Table ${order.tableNumber}`, 135, currentY);
            doc.text(`#${order._id.toString().slice(-6).toUpperCase()}`, 195, currentY);
            doc.text(`${itemCount} items`, 275, currentY);
            doc.text(order.status, 420, currentY);
            doc.font('Helvetica-Bold').text(`INR ${order.totalAmount.toFixed(2)}`, 480, currentY, { width: 70, align: 'right' }).font('Helvetica');
            
            currentY += 16;
        });

        // Grand Total Line
        if (currentY > 730) {
            doc.addPage();
            currentY = 45;
        }

        doc.moveTo(45, currentY + 4).lineTo(550, currentY + 4).strokeColor('#5A724A').lineWidth(1.5).stroke();
        currentY += 10;
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#5A724A');
        doc.text(`GRAND TOTAL: ${orders.length} Orders | ${totalItems} Items`, 45, currentY);
        doc.text(`INR ${totalRevenue.toFixed(2)}`, 440, currentY, { width: 110, align: 'right' });

        doc.end();

    } catch (error) {
        console.error('Daily Report Error:', error);
        res.status(500).json({ message: 'Failed to generate report' });
    }
};

// @desc    Generate Monthly Report (PDF)
// @route   GET /api/reports/monthly?month=M&year=YYYY
const generateMonthlyReport = async (req, res) => {
    try {
        const now = new Date();
        const month = req.query.month ? parseInt(req.query.month) - 1 : now.getMonth();
        const year = req.query.year ? parseInt(req.query.year) : now.getFullYear();

        const startOfMonth = new Date(year, month, 1);
        const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

        const orders = await Order.find({
            createdAt: { $gte: startOfMonth, $lte: endOfMonth },
            status: { $ne: 'Cancelled' }
        }).sort({ createdAt: 1 });

        const totalRevenue = orders.reduce((sum, order) => sum + (Number(order.totalAmount) || 0), 0);
        const totalItems = orders.reduce((sum, order) => sum + order.items.reduce((iSum, i) => iSum + (Number(i.quantity) || 0), 0), 0);

        const doc = new PDFDocument({ margin: 45, size: 'A4' });
        const monthName = startOfMonth.toLocaleString('en-IN', { month: 'long', timeZone: 'Asia/Kolkata' });
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=sparkling-monthly-report-${monthName}-${year}.pdf`);
        doc.pipe(res);

        // Header with Logo
        const logoPath = getLogoPath();
        let topY = 40;
        if (logoPath) {
            try {
                doc.image(logoPath, 45, topY, { width: 70 });
            } catch (err) {
                console.error("Logo load error:", err);
            }
        }

        doc.fontSize(18).font('Helvetica-Bold').fillColor('#222222').text('The Sparkling Garden Restaurant', 125, topY);
        doc.fontSize(9.5).font('Helvetica').fillColor('#555555').text('100% Pure Veg Fine Dining · Deesa, Gujarat', 125, topY + 20);
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#5A724A').text(`Monthly Financial & Operations Report - ${monthName} ${year}`, 125, topY + 34);
        doc.fontSize(8.5).font('Helvetica').fillColor('#777777').text(`Printed on: ${formatISTDateTime(new Date())} (IST)`, 125, topY + 48);

        doc.moveTo(45, topY + 65).lineTo(550, topY + 65).strokeColor('#EBEBEB').stroke();

        // Summary Statistics Box
        doc.roundedRect(45, topY + 75, 505, 45, 8).fillAndStroke('#F4F6F0', '#BCE2A3');
        doc.fillColor('#222222').fontSize(9).font('Helvetica-Bold');
        doc.text('TOTAL ORDERS', 65, topY + 84);
        doc.text('TOTAL ITEMS SOLD', 195, topY + 84);
        doc.text('AVERAGE TICKET', 335, topY + 84);
        doc.text('TOTAL REVENUE (IST)', 445, topY + 84);

        doc.fontSize(12).fillColor('#5A724A').font('Helvetica-Bold');
        doc.text(`${orders.length}`, 65, topY + 98);
        doc.text(`${totalItems}`, 195, topY + 98);
        doc.text(`INR ${orders.length > 0 ? (totalRevenue / orders.length).toFixed(2) : '0.00'}`, 335, topY + 98);
        doc.text(`INR ${totalRevenue.toFixed(2)}`, 445, topY + 98);

        // Group Orders By Date
        const dailyAgg = {};
        orders.forEach(order => {
            const dateKey = formatISTDate(order.createdAt);
            if (!dailyAgg[dateKey]) {
                dailyAgg[dateKey] = { orders: 0, items: 0, revenue: 0 };
            }
            dailyAgg[dateKey].orders += 1;
            dailyAgg[dateKey].items += order.items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
            dailyAgg[dateKey].revenue += Number(order.totalAmount) || 0;
        });

        let currentY = topY + 135;
        doc.fillColor('#222222').fontSize(11).font('Helvetica-Bold').text('Day-by-Day Revenue Summary', 45, currentY);
        currentY += 16;

        doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#666666');
        doc.text('Date (IST)', 45, currentY);
        doc.text('Orders Count', 180, currentY);
        doc.text('Items Sold', 290, currentY);
        doc.text('Avg Order Value', 390, currentY);
        doc.text('Revenue (INR)', 480, currentY, { width: 70, align: 'right' });

        doc.moveTo(45, currentY + 12).lineTo(550, currentY + 12).strokeColor('#222222').stroke();
        currentY += 18;

        doc.font('Helvetica').fontSize(8.5).fillColor('#222222');

        const dateEntries = Object.entries(dailyAgg);
        dateEntries.forEach(([dKey, stats], index) => {
            if (currentY > 740) {
                doc.addPage();
                currentY = 45;
                doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#666666');
                doc.text('Date (IST)', 45, currentY);
                doc.text('Orders Count', 180, currentY);
                doc.text('Items Sold', 290, currentY);
                doc.text('Avg Order Value', 390, currentY);
                doc.text('Revenue (INR)', 480, currentY, { width: 70, align: 'right' });
                doc.moveTo(45, currentY + 12).lineTo(550, currentY + 12).strokeColor('#222222').stroke();
                currentY += 18;
                doc.font('Helvetica').fontSize(8.5).fillColor('#222222');
            }

            if (index % 2 === 0) {
                doc.rect(45, currentY - 2, 505, 16).fill('#FAFAFA');
                doc.fillColor('#222222');
            }

            doc.text(dKey, 47, currentY);
            doc.text(`${stats.orders} orders`, 180, currentY);
            doc.text(`${stats.items} items`, 290, currentY);
            doc.text(`INR ${(stats.revenue / stats.orders).toFixed(2)}`, 390, currentY);
            doc.font('Helvetica-Bold').text(`INR ${stats.revenue.toFixed(2)}`, 480, currentY, { width: 70, align: 'right' }).font('Helvetica');

            currentY += 18;
        });

        // Grand Total Line
        if (currentY > 730) {
            doc.addPage();
            currentY = 45;
        }

        doc.moveTo(45, currentY + 4).lineTo(550, currentY + 4).strokeColor('#5A724A').lineWidth(1.5).stroke();
        currentY += 10;
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#5A724A');
        doc.text(`MONTHLY GRAND TOTAL: ${orders.length} Orders | ${totalItems} Items`, 45, currentY);
        doc.text(`INR ${totalRevenue.toFixed(2)}`, 440, currentY, { width: 110, align: 'right' });

        doc.end();

    } catch (error) {
        console.error('Monthly Report Error:', error);
        res.status(500).json({ message: 'Failed to generate report' });
    }
};

// @desc    Export Orders (PDF / Excel / CSV) with Date-Wise Range & Grand Totals
// @route   GET /api/reports/export?start=YYYY-MM-DD&end=YYYY-MM-DD&format=pdf|csv|excel
const exportOrders = async (req, res) => {
    try {
        const format = (req.query.format || 'pdf').toLowerCase();
        const { start, end } = parseISTRange(req.query.start, req.query.end);

        const orders = await Order.find({
            createdAt: { $gte: start, $lte: end }
        }).sort({ createdAt: -1 });

        const totalRevenue = orders.reduce((sum, order) => sum + (Number(order.totalAmount) || 0), 0);
        const totalItems = orders.reduce((sum, order) => sum + order.items.reduce((iSum, i) => iSum + (Number(i.quantity) || 0), 0), 0);

        const startStr = formatISTDate(start).replace(/\s+/g, '-');
        const endStr = formatISTDate(end).replace(/\s+/g, '-');

        // ================= PDF FORMAT (Date-Wise Report with Totals) =================
        if (format === 'pdf') {
            const doc = new PDFDocument({ margin: 40, size: 'A4' });
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=sparkling-report-${startStr}-to-${endStr}.pdf`);
            doc.pipe(res);

            // Restaurant Header
            const logoPath = getLogoPath();
            let headerY = 40;
            if (logoPath) {
                try {
                    doc.image(logoPath, 40, headerY, { width: 70 });
                } catch (e) {
                    console.error('Logo render error:', e);
                }
            }

            doc.fontSize(17).font('Helvetica-Bold').fillColor('#222222').text('The Sparkling Garden Restaurant', 120, headerY);
            doc.fontSize(9.5).font('Helvetica').fillColor('#555555').text('100% Pure Veg Fine Dining · Deesa, Gujarat', 120, headerY + 20);
            doc.fontSize(11).font('Helvetica-Bold').fillColor('#5A724A').text('Sales & Orders Report (Date-Wise Range)', 120, headerY + 34);
            doc.fontSize(8.5).font('Helvetica').fillColor('#777777').text(`Period: ${formatISTDate(start)} to ${formatISTDate(end)}  |  Generated: ${formatISTDateTime(new Date())} (IST)`, 120, headerY + 48);

            doc.moveTo(40, headerY + 65).lineTo(555, headerY + 65).strokeColor('#EBEBEB').stroke();

            // Summary Stats Box
            const avgOrderVal = orders.length > 0 ? (totalRevenue / orders.length).toFixed(2) : '0.00';
            doc.roundedRect(40, headerY + 75, 515, 45, 8).fillAndStroke('#F4F6F0', '#BCE2A3');
            doc.fillColor('#222222').fontSize(9).font('Helvetica-Bold');
            doc.text('TOTAL ORDERS', 60, headerY + 84);
            doc.text('TOTAL ITEMS SOLD', 190, headerY + 84);
            doc.text('AVERAGE TICKET', 320, headerY + 84);
            doc.text('GRAND TOTAL REVENUE', 435, headerY + 84);

            doc.fontSize(12).fillColor('#5A724A').font('Helvetica-Bold');
            doc.text(`${orders.length}`, 60, headerY + 98);
            doc.text(`${totalItems}`, 190, headerY + 98);
            doc.text(`INR ${avgOrderVal}`, 320, headerY + 98);
            doc.text(`INR ${totalRevenue.toFixed(2)}`, 435, headerY + 98);

            doc.fillColor('#000000');

            // Table Header
            let currentY = headerY + 135;
            doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#666666');
            doc.text('Date & Time (IST)', 40, currentY);
            doc.text('Order ID', 145, currentY);
            doc.text('Table', 215, currentY);
            doc.text('Status', 265, currentY);
            doc.text('Payment', 330, currentY);
            doc.text('Items', 395, currentY);
            doc.text('Total (INR)', 485, currentY, { width: 70, align: 'right' });

            doc.moveTo(40, currentY + 12).lineTo(555, currentY + 12).strokeColor('#222222').stroke();
            currentY += 18;

            doc.font('Helvetica').fontSize(8).fillColor('#222222');

            orders.forEach((order, index) => {
                if (currentY > 745) {
                    doc.addPage();
                    currentY = 40;
                    doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#666666');
                    doc.text('Date & Time (IST)', 40, currentY);
                    doc.text('Order ID', 145, currentY);
                    doc.text('Table', 215, currentY);
                    doc.text('Status', 265, currentY);
                    doc.text('Payment', 330, currentY);
                    doc.text('Items', 395, currentY);
                    doc.text('Total (INR)', 485, currentY, { width: 70, align: 'right' });
                    doc.moveTo(40, currentY + 12).lineTo(555, currentY + 12).strokeColor('#222222').stroke();
                    currentY += 18;
                    doc.font('Helvetica').fontSize(8).fillColor('#222222');
                }

                if (index % 2 === 0) {
                    doc.rect(40, currentY - 2, 515, 15).fill('#FAFAFA');
                    doc.fillColor('#222222');
                }

                const timeStr = formatISTDateTime(order.createdAt);
                const orderIdStr = '#' + order._id.toString().slice(-6).toUpperCase();
                const tableStr = `Table ${order.tableNumber}`;
                const statusStr = order.status || 'Completed';
                const payModeStr = order.paymentMode || 'Dine-In';
                const itemsCountStr = `${order.items.reduce((s, i) => s + (Number(i.quantity) || 0), 0)} items`;
                const amountStr = `INR ${(order.totalAmount || 0).toFixed(2)}`;

                doc.text(timeStr, 42, currentY, { width: 100 });
                doc.text(orderIdStr, 145, currentY);
                doc.text(tableStr, 215, currentY);
                doc.text(statusStr, 265, currentY);
                doc.text(payModeStr, 330, currentY);
                doc.text(itemsCountStr, 395, currentY);
                doc.font('Helvetica-Bold').text(amountStr, 485, currentY, { width: 70, align: 'right' }).font('Helvetica');

                currentY += 16;
            });

            // Table Grand Total Footer
            if (currentY > 730) {
                doc.addPage();
                currentY = 40;
            }

            doc.moveTo(40, currentY + 4).lineTo(555, currentY + 4).strokeColor('#5A724A').lineWidth(1.5).stroke();
            currentY += 10;

            doc.fontSize(10).font('Helvetica-Bold').fillColor('#5A724A');
            doc.text('GRAND TOTAL:', 40, currentY);
            doc.text(`${orders.length} Orders  |  ${totalItems} Total Items`, 145, currentY);
            doc.text(`INR ${totalRevenue.toFixed(2)}`, 450, currentY, { width: 105, align: 'right' });

            doc.end();
            return;
        }

        // ================= CSV FORMAT =================
        const exportData = orders.map(order => ({
            OrderID: order._id.toString(),
            Date_IST: formatISTDate(order.createdAt),
            Time_IST: formatISTTime(order.createdAt),
            Table: `Table ${order.tableNumber}`,
            Status: order.status,
            PaymentMode: order.paymentMode,
            ItemsCount: order.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
            TotalAmount_INR: Number(order.totalAmount || 0).toFixed(2)
        }));

        if (format === 'csv') {
            const fields = ['OrderID', 'Date_IST', 'Time_IST', 'Table', 'Status', 'PaymentMode', 'ItemsCount', 'TotalAmount_INR'];
            const json2csvParser = new Parser({ fields });
            let csv = json2csvParser.parse(exportData);
            // Append Grand Total Row
            csv += `\n"SUMMARY","TOTAL ORDERS: ${orders.length}","","","","TOTAL ITEMS: ${totalItems}","","GRAND TOTAL INR: ${totalRevenue.toFixed(2)}"`;
            
            res.header('Content-Type', 'text/csv');
            res.attachment(`sparkling-orders-${startStr}-to-${endStr}.csv`);
            return res.send(csv);
        } 
        
        // ================= EXCEL FORMAT =================
        if (format === 'excel' || format === 'xlsx') {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Sales Orders');
            
            worksheet.columns = [
                { header: 'Order ID', key: 'OrderID', width: 26 },
                { header: 'Date (IST)', key: 'Date_IST', width: 16 },
                { header: 'Time (IST)', key: 'Time_IST', width: 14 },
                { header: 'Table', key: 'Table', width: 12 },
                { header: 'Status', key: 'Status', width: 15 },
                { header: 'Payment Mode', key: 'PaymentMode', width: 15 },
                { header: 'Items Count', key: 'ItemsCount', width: 14 },
                { header: 'Total Amount (INR)', key: 'TotalAmount_INR', width: 20 }
            ];

            worksheet.getRow(1).font = { bold: true };
            worksheet.addRows(exportData);

            // Add Summary Row
            const summaryRow = worksheet.addRow({
                OrderID: `GRAND TOTAL (${orders.length} Orders)`,
                Date_IST: '',
                Time_IST: '',
                Table: '',
                Status: '',
                PaymentMode: '',
                ItemsCount: totalItems,
                TotalAmount_INR: Number(totalRevenue.toFixed(2))
            });
            summaryRow.font = { bold: true };

            res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.attachment(`sparkling-orders-${startStr}-to-${endStr}.xlsx`);
            
            await workbook.xlsx.write(res);
            res.end();
            return;
        }

        res.status(400).json({ message: 'Invalid format requested. Use pdf, excel, or csv.' });

    } catch (error) {
        console.error('Export Error:', error);
        res.status(500).json({ message: 'Failed to export data' });
    }
};

// @desc    Generate Single Order Customer Bill (PDF) with Restaurant Logo
// @route   GET /api/reports/bill/:id
const generateCustomerBill = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Receipt sized page: width 280pt, height dynamic to ensure no cutoff
        const itemsCount = (order.items && order.items.length) || 1;
        const pageHeight = Math.max(520, 360 + (itemsCount * 24));
        const doc = new PDFDocument({ margin: 20, size: [280, pageHeight] });
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=bill-table-${order.tableNumber}-${order._id.toString().slice(-6)}.pdf`);
        doc.pipe(res);

        // Logo
        const logoPath = getLogoPath();
        let topY = 16;
        if (logoPath) {
            try {
                doc.image(logoPath, 90, topY, { width: 100, align: 'center' });
                topY += 46;
            } catch (e) {
                console.error('Logo render error in bill:', e);
            }
        }

        doc.y = topY;
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#000000').text('SPARKLING', { align: 'center' });
        doc.fontSize(10).font('Helvetica-Bold').text('GARDEN RESTAURANT', { align: 'center' });
        doc.fontSize(7.5).font('Helvetica').fillColor('#333333').text('At. & Po.Rasana Mota, Palanpur Highway,Deesa- 385535', { align: 'center' });
        doc.fontSize(7).font('Helvetica').text('EMail:thesparkling2018@gmail.com , Mobile : +91 94093 22022', { align: 'center' });
        doc.moveDown(0.2);
        doc.moveTo(20, doc.y).lineTo(260, doc.y).strokeColor('#000000').lineWidth(0.75).stroke();
        doc.moveDown(0.3);

        // Bill No, TAX INVOICE box, Date
        const billNo = order.invoiceNumber || (parseInt(order._id.toString().slice(-4), 16) % 9000 + 1000) || 3663;
        const metaY = doc.y;
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#000000');
        doc.text(`Bill No:  ${billNo}`, 20, metaY);
        doc.text('TAX INVOICE', 110, metaY, { width: 60, align: 'center' });
        doc.rect(108, metaY - 1, 64, 11).strokeColor('#000000').lineWidth(0.5).stroke();
        const dStr = new Date(order.createdAt).toLocaleDateString('en-GB');
        doc.text(`Date:  ${dStr}`, 180, metaY, { width: 80, align: 'right' });

        doc.y = metaY + 14;
        doc.font('Helvetica').fontSize(8);
        doc.text(`Name:   ${order.customerName || ''}`, 20, doc.y);
        const nameY = doc.y;
        doc.text(`GST IN: ${order.customerGstin || ''}`, 20, nameY);
        doc.font('Helvetica-Bold').text(`Table No:  ${order.tableNumber}`, 180, nameY, { width: 80, align: 'right' });
        doc.moveDown(0.3);
        doc.moveTo(20, doc.y).lineTo(260, doc.y).strokeColor('#000000').lineWidth(0.75).stroke();
        doc.moveDown(0.3);

        // Table Header
        const itemY = doc.y;
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#000000');
        doc.text('Sr. No', 20, itemY, { width: 25 });
        doc.text('D E S C R I P T I O N', 48, itemY, { width: 120 });
        doc.text('QTY', 170, itemY, { width: 22, align: 'right' });
        doc.text('PRICE', 194, itemY, { width: 32, align: 'right' });
        doc.text('AMOUNT', 228, itemY, { width: 32, align: 'right' });
        doc.moveDown(0.2);
        doc.moveTo(20, doc.y).lineTo(260, doc.y).strokeColor('#000000').lineWidth(0.5).stroke();
        doc.moveDown(0.3);

        // Items List
        let subtotal = 0;
        doc.font('Helvetica').fontSize(7.5).fillColor('#000000');
        order.items.filter(i => i.status !== 'cancelled').forEach((item, index) => {
            const rowY = doc.y;
            const itemQty = Number(item.quantity) || 1;
            const itemPrice = Number(item.price) || 0;
            const itemTotal = itemQty * itemPrice;
            subtotal += itemTotal;

            doc.text(`${index + 1}`, 20, rowY, { width: 25 });
            doc.text(String(item.name || '').toUpperCase().substring(0, 24), 48, rowY, { width: 120 });
            doc.text(`${itemQty}`, 170, rowY, { width: 22, align: 'right' });
            doc.text(`${itemPrice.toFixed(2)}`, 194, rowY, { width: 32, align: 'right' });
            doc.text(`${itemTotal.toFixed(2)}`, 228, rowY, { width: 32, align: 'right' });
            doc.moveDown(0.35);
        });

        doc.moveDown(0.2);
        doc.moveTo(20, doc.y).lineTo(260, doc.y).strokeColor('#000000').lineWidth(0.75).stroke();
        doc.moveDown(0.3);

        // Tax Calculation & Round Off
        const discount = order.discountAmount || 0;
        const taxable = Math.max(0, subtotal - discount);
        const cgst = +(taxable * 0.025).toFixed(2);
        const sgst = +(taxable * 0.025).toFixed(2);
        const rawTotal = taxable + cgst + sgst;
        const grandTotal = Math.round(rawTotal);
        const roundOff = +(grandTotal - rawTotal).toFixed(2);

        const leftY = doc.y;
        doc.font('Helvetica').fontSize(7.5).fillColor('#000000');
        doc.text('GST. IN : 24BRUPP4641N1Z0', 20, leftY);
        doc.text('HSN/SAC Code : 996334', 20, leftY + 11);

        // Right totals block
        doc.text('Total:', 160, leftY, { width: 55, align: 'right' });
        doc.text(`${subtotal.toFixed(2)}`, 218, leftY, { width: 42, align: 'right' });

        doc.text('Disc:', 160, leftY + 11, { width: 55, align: 'right' });
        doc.text(discount > 0 ? `${discount.toFixed(2)}` : '', 218, leftY + 11, { width: 42, align: 'right' });

        doc.text('C GST @ 2.5% :', 140, leftY + 22, { width: 75, align: 'right' });
        doc.text(`${cgst.toFixed(2)}`, 218, leftY + 22, { width: 42, align: 'right' });

        doc.text('S GST @ 2.5% :', 140, leftY + 33, { width: 75, align: 'right' });
        doc.text(`${sgst.toFixed(2)}`, 218, leftY + 33, { width: 42, align: 'right' });

        doc.text('Round Off:-', 150, leftY + 44, { width: 65, align: 'right' });
        doc.text(`${roundOff.toFixed(2)}`, 218, leftY + 44, { width: 42, align: 'right' });

        doc.moveTo(150, leftY + 56).lineTo(260, leftY + 56).strokeColor('#000000').lineWidth(0.5).stroke();

        doc.font('Helvetica-Bold').fontSize(9);
        doc.text('Grand Total:', 140, leftY + 60, { width: 75, align: 'right' });
        doc.text(`${grandTotal.toFixed(2)}`, 218, leftY + 60, { width: 42, align: 'right' });

        doc.moveTo(150, leftY + 73).lineTo(260, leftY + 73).strokeColor('#000000').lineWidth(0.5).stroke();
        doc.moveTo(150, leftY + 75).lineTo(260, leftY + 75).strokeColor('#000000').lineWidth(0.5).stroke();

        doc.y = leftY + 84;
        doc.moveTo(20, doc.y).lineTo(260, doc.y).strokeColor('#000000').lineWidth(0.75).stroke();
        doc.moveDown(0.3);
        doc.font('Helvetica').fontSize(7.5).text('Subject to Deesa jurisdiction only', { align: 'center' });
        doc.fontSize(6.5).fillColor('#888888').text('GST Included in Final Price · Powered by The Sparkling', { align: 'center' });

        doc.end();

    } catch (error) {
        console.error('Customer bill error:', error);
        res.status(500).json({ message: 'Failed to generate customer bill' });
    }
};

// @desc    Generate Aggregated Table Customer Bill (PDF) matching physical Tax Invoice slip
// @route   GET /api/reports/bill/table/:tableId
const generateTableBill = async (req, res) => {
    try {
        const tableId = req.params.tableId;
        const orders = await Order.find({
            tableNumber: tableId,
            status: { $nin: ['Paid', 'Cancelled'] },
            ...(req.guestAccessToken ? { guestAccessToken: req.guestAccessToken } : {})
        });

        if (orders.length === 0) {
            return res.status(404).json({ message: 'No active orders found for Table ' + tableId });
        }

        // Aggregate items
        const itemMap = {};
        let customerName = '';
        let customerGstin = '';
        orders.forEach(order => {
            if (!customerName && order.customerName) customerName = order.customerName;
            if (!customerGstin && order.customerGstin) customerGstin = order.customerGstin;
            order.items.forEach(item => {
                if (item.status === 'cancelled') return;
                const key = item.name;
                if (!itemMap[key]) {
                    itemMap[key] = {
                        name: item.name,
                        quantity: 0,
                        price: Number(item.price) || 0
                    };
                }
                itemMap[key].quantity += (Number(item.quantity) || 1);
            });
        });
        const aggregatedItems = Object.values(itemMap);

        const pageHeight = Math.max(520, 360 + (aggregatedItems.length * 24));
        const doc = new PDFDocument({ margin: 20, size: [280, pageHeight] });
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=table-${tableId}-tax-invoice.pdf`);
        doc.pipe(res);

        // Logo
        const logoPath = getLogoPath();
        let topY = 16;
        if (logoPath) {
            try {
                doc.image(logoPath, 90, topY, { width: 100, align: 'center' });
                topY += 46;
            } catch (e) {
                console.error('Logo render error on table bill:', e);
            }
        }

        doc.y = topY;
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#000000').text('SPARKLING', { align: 'center' });
        doc.fontSize(10).font('Helvetica-Bold').text('GARDEN RESTAURANT', { align: 'center' });
        doc.fontSize(7.5).font('Helvetica').fillColor('#333333').text('At. & Po.Rasana Mota, Palanpur Highway,Deesa- 385535', { align: 'center' });
        doc.fontSize(7).font('Helvetica').text('EMail:thesparkling2018@gmail.com , Mobile : +91 94093 22022', { align: 'center' });
        doc.moveDown(0.2);
        doc.moveTo(20, doc.y).lineTo(260, doc.y).strokeColor('#000000').lineWidth(0.75).stroke();
        doc.moveDown(0.3);

        // Bill No, TAX INVOICE box, Date
        const firstOrder = orders[0];
        const billNo = firstOrder.invoiceNumber || (parseInt(firstOrder._id.toString().slice(-4), 16) % 9000 + 1000) || 3663;
        const metaY = doc.y;
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#000000');
        doc.text(`Bill No:  ${billNo}`, 20, metaY);
        doc.text('TAX INVOICE', 110, metaY, { width: 60, align: 'center' });
        doc.rect(108, metaY - 1, 64, 11).strokeColor('#000000').lineWidth(0.5).stroke();
        const dStr = new Date().toLocaleDateString('en-GB');
        doc.text(`Date:  ${dStr}`, 180, metaY, { width: 80, align: 'right' });

        doc.y = metaY + 14;
        doc.font('Helvetica').fontSize(8);
        doc.text(`Name:   ${customerName || ''}`, 20, doc.y);
        const nameY = doc.y;
        doc.text(`GST IN: ${customerGstin || ''}`, 20, nameY);
        doc.font('Helvetica-Bold').text(`Table No:  ${tableId}`, 180, nameY, { width: 80, align: 'right' });
        doc.moveDown(0.3);
        doc.moveTo(20, doc.y).lineTo(260, doc.y).strokeColor('#000000').lineWidth(0.75).stroke();
        doc.moveDown(0.3);

        // Table Header
        const itemY = doc.y;
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#000000');
        doc.text('Sr. No', 20, itemY, { width: 25 });
        doc.text('D E S C R I P T I O N', 48, itemY, { width: 120 });
        doc.text('QTY', 170, itemY, { width: 22, align: 'right' });
        doc.text('PRICE', 194, itemY, { width: 32, align: 'right' });
        doc.text('AMOUNT', 228, itemY, { width: 32, align: 'right' });
        doc.moveDown(0.2);
        doc.moveTo(20, doc.y).lineTo(260, doc.y).strokeColor('#000000').lineWidth(0.5).stroke();
        doc.moveDown(0.3);

        // Aggregated Items List
        let subtotal = 0;
        doc.font('Helvetica').fontSize(7.5).fillColor('#000000');
        aggregatedItems.forEach((item, index) => {
            const rowY = doc.y;
            const itemQty = Number(item.quantity) || 1;
            const itemPrice = Number(item.price) || 0;
            const itemTotal = itemQty * itemPrice;
            subtotal += itemTotal;

            doc.text(`${index + 1}`, 20, rowY, { width: 25 });
            doc.text(String(item.name || '').toUpperCase().substring(0, 24), 48, rowY, { width: 120 });
            doc.text(`${itemQty}`, 170, rowY, { width: 22, align: 'right' });
            doc.text(`${itemPrice.toFixed(2)}`, 194, rowY, { width: 32, align: 'right' });
            doc.text(`${itemTotal.toFixed(2)}`, 228, rowY, { width: 32, align: 'right' });
            doc.moveDown(0.35);
        });

        doc.moveDown(0.2);
        doc.moveTo(20, doc.y).lineTo(260, doc.y).strokeColor('#000000').lineWidth(0.75).stroke();
        doc.moveDown(0.3);

        // Tax Calculation & Round Off (Gujarat SGST 2.5% + CGST 2.5%)
        const discount = orders.reduce((sum, o) => sum + (o.discountAmount || 0), 0);
        const taxable = Math.max(0, subtotal - discount);
        const cgst = +(taxable * 0.025).toFixed(2);
        const sgst = +(taxable * 0.025).toFixed(2);
        const rawTotal = taxable + cgst + sgst;
        const grandTotal = Math.round(rawTotal);
        const roundOff = +(grandTotal - rawTotal).toFixed(2);

        const leftY = doc.y;
        doc.font('Helvetica').fontSize(7.5).fillColor('#000000');
        doc.text('GST. IN : 24BRUPP4641N1Z0', 20, leftY);
        doc.text('HSN/SAC Code : 996334', 20, leftY + 11);

        doc.text('Total:', 160, leftY, { width: 55, align: 'right' });
        doc.text(`${subtotal.toFixed(2)}`, 218, leftY, { width: 42, align: 'right' });

        doc.text('Disc:', 160, leftY + 11, { width: 55, align: 'right' });
        doc.text(discount > 0 ? `${discount.toFixed(2)}` : '', 218, leftY + 11, { width: 42, align: 'right' });

        doc.text('C GST @ 2.5% :', 140, leftY + 22, { width: 75, align: 'right' });
        doc.text(`${cgst.toFixed(2)}`, 218, leftY + 22, { width: 42, align: 'right' });

        doc.text('S GST @ 2.5% :', 140, leftY + 33, { width: 75, align: 'right' });
        doc.text(`${sgst.toFixed(2)}`, 218, leftY + 33, { width: 42, align: 'right' });

        doc.text('Round Off:-', 150, leftY + 44, { width: 65, align: 'right' });
        doc.text(`${roundOff.toFixed(2)}`, 218, leftY + 44, { width: 42, align: 'right' });

        doc.moveTo(150, leftY + 56).lineTo(260, leftY + 56).strokeColor('#000000').lineWidth(0.5).stroke();

        doc.font('Helvetica-Bold').fontSize(9);
        doc.text('Grand Total:', 140, leftY + 60, { width: 75, align: 'right' });
        doc.text(`${grandTotal.toFixed(2)}`, 218, leftY + 60, { width: 42, align: 'right' });

        doc.moveTo(150, leftY + 73).lineTo(260, leftY + 73).strokeColor('#000000').lineWidth(0.5).stroke();
        doc.moveTo(150, leftY + 75).lineTo(260, leftY + 75).strokeColor('#000000').lineWidth(0.5).stroke();

        doc.y = leftY + 84;
        doc.moveTo(20, doc.y).lineTo(260, doc.y).strokeColor('#000000').lineWidth(0.75).stroke();
        doc.moveDown(0.3);
        doc.font('Helvetica').fontSize(7.5).text('Subject to Deesa jurisdiction only', { align: 'center' });
        doc.fontSize(6.5).fillColor('#888888').text('GST Included in Final Price · Powered by The Sparkling', { align: 'center' });

        doc.end();

    } catch (error) {
        console.error('Table bill error:', error);
        res.status(500).json({ message: 'Failed to generate table bill' });
    }
};

module.exports = { generateDailyReport, generateMonthlyReport, exportOrders, generateCustomerBill, generateTableBill };
