require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const CovidSchema = new mongoose.Schema({
  iso: String,
  date: String,
  confirmed: Number,
  deaths: Number,
});

const CovidData = mongoose.model('CovidData', CovidSchema);

// POST: Save data
app.post('/api/save', async (req, res) => {
  try {
    const saved = await CovidData.create(req.body);
    res.json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET: Retrieve data
app.get('/api/data/:iso', async (req, res) => {
  try {
    const data = await CovidData.find({ iso: req.params.iso });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const path = require('path');
app.use(express.static(path.join(__dirname, 'build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(5000, () => console.log('Server running on port 5000'));