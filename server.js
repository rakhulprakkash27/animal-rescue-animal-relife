require('dotenv').config();

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const port = Number(process.env.PORT) || 3000;
const uploadDirectory = path.join(__dirname, 'uploads');
const reportsFile = path.join(__dirname, 'reports.json');
const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

fs.mkdirSync(uploadDirectory, { recursive: true });
if (!fs.existsSync(reportsFile)) fs.writeFileSync(reportsFile, '[]');

const storage = multer.diskStorage({
  destination: uploadDirectory,
  filename: (_request, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${Date.now()}-${crypto.randomUUID()}${extension}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_request, file, callback) => {
    callback(null, allowedTypes.has(file.mimetype));
  }
});

app.use(express.json());
app.use('/uploads', express.static(uploadDirectory));
app.use(express.static(path.join(__dirname, 'public')));

function readReports() {
  return JSON.parse(fs.readFileSync(reportsFile, 'utf8'));
}

function saveReport(report) {
  const reports = readReports();
  reports.unshift(report);
  fs.writeFileSync(reportsFile, JSON.stringify(reports, null, 2));
}

function getWebhookUrls() {
  try {
    const urls = JSON.parse(process.env.RESCUE_WEBHOOKS || '[]');
    return Array.isArray(urls) ? urls.filter(Boolean) : [];
  } catch {
    return [];
  }
}

async function notifyTeams(report) {
  const webhookUrls = getWebhookUrls();
  if (!webhookUrls.length) {
    return { mode: 'demo', recipients: ['Demo rescue queue'] };
  }

  const message = {
    event: 'new_animal_rescue_report',
    reportId: report.id,
    animalType: report.animalType,
    urgency: report.urgency,
    description: report.description,
    location: report.location,
    imageUrl: report.imageUrl,
    createdAt: report.createdAt
  };

  const results = await Promise.allSettled(webhookUrls.map(async (url) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(message)
    });
    if (!response.ok) throw new Error(`Webhook responded ${response.status}`);
    return url;
  }));

  const successful = results.filter((result) => result.status === 'fulfilled').map((result) => result.value);
  const failed = results.filter((result) => result.status === 'rejected').length;
  if (!successful.length) throw new Error('Rescue team notification failed');

  return { mode: 'webhook', recipients: successful, failed };
}

app.post('/api/reports', upload.single('image'), async (request, response) => {
  if (!request.file) {
    return response.status(400).json({ error: 'Please upload a JPG, PNG, or WebP image.' });
  }

  const { animalType, urgency, description, location, contact } = request.body;
  if (!animalType || !urgency || !description || !location || !contact) {
    fs.unlinkSync(request.file.path);
    return response.status(400).json({ error: 'Please complete all report fields.' });
  }

  const report = {
    id: `AR-${Date.now().toString(36).toUpperCase()}`,
    animalType,
    urgency,
    description: description.trim(),
    location: location.trim(),
    contact: contact.trim(),
    imageUrl: `/uploads/${request.file.filename}`,
    createdAt: new Date().toISOString(),
    status: 'notified'
  };

  try {
    const notification = await notifyTeams(report);
    report.notification = notification;
    saveReport(report);
    return response.status(201).json({ message: 'Report sent to rescue teams.', report });
  } catch (error) {
    fs.unlinkSync(request.file.path);
    return response.status(502).json({ error: error.message });
  }
});

app.get('/api/reports', (_request, response) => {
  response.json(readReports().map(({ contact, ...report }) => report));
});

app.get('*', (_request, response) => {
  response.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Animal Rescue Connect running at http://localhost:${port}`);
});
