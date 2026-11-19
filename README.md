# E-Buks by Era
Offline company books: invoices, quotations, receipts, purchase orders and delivery notes.
A product of Era Tech, under Inkstream Media.

## What is in this folder
```
e-buks-app/
├── index.html               App shell. Open this file to start.
├── manifest.webmanifest     Makes the app installable (name, colours, icons).
├── sw.js                    Service worker: caches the app so it works offline.
├── css/
│   ├── fonts.css            Bundled Poppins font (works offline).
│   └── app.css              All styling, A4 document sheet and print rules.
├── js/                      Loaded in this order (see index.html)
│   ├── config.js            Book types, default settings, logo path.
│   ├── store.js             Saving (localStorage + IndexedDB copy), backup, restore.
│   ├── utils.js             Helpers: money format, totals maths, dates, phone numbers, file saving.
│   ├── importers.js         Reads product lists from Excel, CSV, PDF or pasted text.
│   ├── barcode.js           Code 128 barcode and authentication codes.
│   ├── components.js        Navigation, header strip, A4 document sheet.
│   ├── exports.js           PDF, Word, HTML, Markdown, Text, CSV, JSON.
│   ├── whatsapp.js          Send to a client on WhatsApp, share the PDF.
│   ├── pages-home.js        Home shelf and the Verify box.
│   ├── slider.js            Default promo slider on the home hero (fixed banners).
│   ├── pages-books.js       Book pages, paid / unpaid / overdue invoices.
│   ├── pages-editor.js      New, edit, view, delete documents.
│   ├── pages-clients.js     Client records and history.
│   ├── pages-products.js    Products and stock, import preview, price fill-in for documents.
│   ├── pages-scan.js        Scan receipts, receipt photo storage, expense ledger and books summary.
│   ├── pages-settings.js    Company details, header strip, logo / letterhead, backup.
│   └── app.js               Router, start-up, service worker registration.
├── fonts/                   Poppins font files.
├── icons/                   App icons (Android, iOS, favicon).
└── assets/logo.png          ebuks by era logo.
```

## Run it
- **Quick test on a computer:** double-click `index.html`. It runs and saves data, but installing and full offline caching need the steps below.
- **Install on phones and computers:** the app must be served over **HTTPS** (or `http://localhost`). Put the whole folder on any static host: GitHub Pages, Netlify, Cloudflare Pages, or your own web server. No server code is needed.
  1. Open the hosted address once while online. The app caches itself.
  2. **Android (Chrome):** menu, then *Install app* / *Add to Home screen*.
  3. **iPhone / iPad (Safari):** Share, then *Add to Home Screen*.
  4. **Windows / Mac / Chromebook (Chrome or Edge):** click the install icon in the address bar.
- After the first visit it opens and works with no internet.

## Where your data lives
Data is saved on the device you use (browser storage, with a second copy in IndexedDB). It does not sync between devices.
- Use **Settings, then Download backup** regularly. **Restore from backup** loads it on any device.
- Clearing browser data or uninstalling the app erases it. Installed apps are far less likely to be cleared than browser tabs.

## Updating the app
After you change any file, edit `CACHE='ebuks-v1'` in `sw.js` to a new name (for example `ebuks-v2`) so devices pick up the update.

## Products and stock
- **Products** page: add products by hand (name, SKU, price, optional stock), or import a list.
- **Import:** drop an Excel (.xlsx), CSV or PDF file. Name and Price columns are found automatically, and SKU and Stock columns are used if present. Old `.xls` files must be saved as `.xlsx` or `.csv` first.
- **PDF import** works for text-based PDFs only. Scanned or locked PDFs cannot be read, so use Excel or CSV, or copy the list and use **Paste list**.
- In any document, type in the item box and pick a product. The description and price fill in automatically; change the quantity and totals update.
- Stock reduces when an invoice or receipt is saved. Editing or deleting it puts the stock back correctly. Quotations, purchase orders and delivery notes do not change stock. Products with an empty stock field are not tracked.

## Promo slider
The home hero has a built-in slider with two banners (`assets/banners/`). Users cannot add or change them. They slide every 5 seconds, with arrows, dots and swipe, and the second banner opens **Scan receipts** when tapped. To change the banners, replace the image files (keep the 2576 × 914 shape) or edit `BANNERS` in `js/slider.js`, then bump the cache name in `sw.js`.

## Scan receipts
- **Scan receipts** page: *Scan with camera* opens the phone camera. *Upload a photo* picks an existing picture. On a computer both open a file chooser.
- Photos are cleaned up (black and white), shrunk to about 1600 px and stored on the device in IndexedDB, so they work offline and do not fill the normal data store.
- After each scan you confirm the date, shop, category, total, tax, payment method and notes, then save. Receipts are grouped by month with thumbnails; tap one to see it full size.
- **Books:** monthly totals, expenses by category, and a Books summary of income (paid invoices) against expenses with the net result. *Export ledger (CSV)* opens in Excel.
- The browser may read the date, shop and total for you where it supports text detection. That depends on the browser and is not available everywhere, so always check the details before saving.
- Backups include receipt photos, so a restored backup brings everything back.

## WhatsApp numbers
The default country code is **+266** (change it in Settings). Local numbers such as `5800 0000` or `058000000` get the code added automatically. Numbers that start with `+` or already include a country code are left alone.

## Notes
- Authentication code: printed under every barcode. Use **Verify a document** on the home page to check it.
- The built-in PDF is a one-page text PDF with your company details and colours. For an exact copy with the logo or letterhead, use Print, then Save as PDF.
- Printing and layout are A4.
