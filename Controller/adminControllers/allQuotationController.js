import Quotation from '../../models/Quotation.js';

const allQuotationController = async (req, res) => {
  try {
    const { page, limit, skip } = req.pagination;
    const quotations = await Quotation.find()
      .populate('createdBy', 'username userId role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const total = await Quotation.countDocuments();
    res.json({
      message: 'All quotations fetched',
      data: quotations,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export default allQuotationController;
