const Sheet = require('../models/Sheet');

exports.createSheet = async (req, res) => {
  try {
    const { name, description, imageUrl } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Sheet name is required.' });
    }
    
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    
    let sheet = await Sheet.findOne({ slug });
    if (sheet) {
      return res.status(400).json({ message: 'A sheet with this name already exists.' });
    }

    sheet = new Sheet({
      name,
      slug,
      description,
      imageUrl,
      createdBy: req.user.id
    });

    await sheet.save();
    res.status(201).json(sheet);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getAllSheets = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 0; // 0 means all
    // Sort by most recently created
    const query = Sheet.find().sort({ createdAt: -1 });
    if (limit > 0) query.limit(limit);
    
    const sheets = await query;
    res.status(200).json(sheets);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getSheetBySlug = async (req, res) => {
  try {
    const sheet = await Sheet.findOne({ slug: req.params.slug });
    if (!sheet) {
      return res.status(404).json({ message: 'Sheet not found.' });
    }
    res.status(200).json(sheet);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteSheet = async (req, res) => {
  try {
    const sheet = await Sheet.findById(req.params.id);
    if (!sheet) {
      return res.status(404).json({ message: 'Sheet not found.' });
    }
    await sheet.deleteOne();
    res.status(200).json({ message: 'Sheet deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
