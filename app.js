const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const multer = require('multer');
const jsqr = require('jsqr');
const { createCanvas, loadImage } = require('canvas');  // Make sure you have 'canvas' installed

const QRCode = require('qrcode');

const app = express();
const PORT = 3000;

// MongoDB Connection
mongoose.connect('mongodb+srv://user:LJSADFLKsfdjlf@cluster0.r2zen.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// MongoDB Schema and Model
const QRSchema = new mongoose.Schema({
  data: String,
  timestamp: { type: Date, default: Date.now },
});
const QRModel = mongoose.model('QRData', QRSchema);

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Multer Configuration for File Upload
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Routes
app.get('/', (req, res) => {
  res.render('index', { message: null });
});

app.get('/admin', async (req, res) => {
  const qrData = await QRModel.find();
  res.render('admin', { qrData });
});

// QR Code Upload Handler
app.post('/upload-qr', upload.single('qrCode'), (req, res) => {

  // Check if a file was uploaded
  if (!req.file) {
    console.log("No file uploaded");
    return res.render('index', { message: 'No file uploaded! Please upload a QR code file.' });
  }

  console.log("File uploaded:", req.file);  // Log the uploaded file details
  const fileBuffer = req.file.buffer;

  // Convert buffer to image using 'canvas'
  loadImage(fileBuffer).then(image => {
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);

    // Get image data for jsqr
    const imageData = ctx.getImageData(0, 0, image.width, image.height);
    const qrData = jsqr(imageData.data, image.width, image.height);

    if (!qrData) {
      console.error("No QR code detected in the image");
      return res.render('index', { message: 'Invalid QR code! Please try again.' });
    }

    console.log("QR Code decoded:", qrData.data);  // Log the decoded QR data

    // Save to MongoDB
    const qrEntry = new QRModel({ data: qrData.data });
    qrEntry.save().then(() => {
      console.log("QR Data saved to MongoDB:", qrEntry);
      res.render('index', { message: 'WiFi QR scanned successfully!' });
    }).catch(err => {
      console.error("Error saving to MongoDB:", err);
      res.render('index', { message: 'Error saving QR data to database.' });
    });
  }).catch(err => {
    console.error("Error loading image:", err);
    res.render('index', { message: 'Error processing the QR code image.' });
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
