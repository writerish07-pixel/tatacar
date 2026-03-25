import Lead from '../../models/Lead.js';

export const createLead = async (req, res) => {
  try {
    const lead = new Lead({ ...req.body, createdBy: req.user.userId, assignedTo: req.body.assignedTo || req.user.userId });
    await lead.save();
    res.status(201).json({ message: 'Lead created', data: lead });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export const getLeads = async (req, res) => {
  try {
    const { page, limit, skip } = req.pagination;
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.source) filter.source = req.query.source;
    if (req.user.role === 'sales') filter.assignedTo = req.user.userId;
    const leads = await Lead.find(filter)
      .populate('assignedTo', 'username userId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const total = await Lead.countDocuments(filter);
    res.json({ data: leads, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export const getLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id).populate('assignedTo', 'username userId');
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    res.json({ data: lead });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export const updateLeadStatus = async (req, res) => {
  try {
    const { status, note } = req.body;
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    lead.status = status;
    lead.updatedAt = new Date();
    if (note) {
      lead.activities.push({ type: 'status_change', note, createdBy: req.user.userId });
    }
    await lead.save();
    res.json({ message: 'Lead status updated', data: lead });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export const addActivity = async (req, res) => {
  try {
    const { type, note } = req.body;
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    lead.activities.push({ type, note, createdBy: req.user.userId });
    lead.updatedAt = new Date();
    await lead.save();
    res.json({ message: 'Activity added', data: lead });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export const updateFollowUp = async (req, res) => {
  try {
    const { followUpDate } = req.body;
    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      { followUpDate, updatedAt: new Date() },
      { new: true }
    );
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    res.json({ message: 'Follow-up date updated', data: lead });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export const getTodayFollowUps = async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    const filter = {
      followUpDate: { $gte: startOfDay, $lte: endOfDay },
      status: { $nin: ['won', 'lost'] },
    };
    if (req.user.role === 'sales') filter.assignedTo = req.user.userId;
    const leads = await Lead.find(filter).populate('assignedTo', 'username userId');
    res.json({ data: leads });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};
