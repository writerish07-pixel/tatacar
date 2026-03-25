import TestDrive from '../../models/TestDrive.js';

export const scheduleTestDrive = async (req, res) => {
  try {
    const testDrive = new TestDrive({ ...req.body, createdBy: req.user.userId });
    await testDrive.save();
    res.status(201).json({ message: 'Test drive scheduled', data: testDrive });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export const getTestDrives = async (req, res) => {
  try {
    const { page, limit, skip } = req.pagination;
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.user.role === 'sales') filter.conductedBy = req.user.userId;
    const testDrives = await TestDrive.find(filter)
      .populate('vehicleId', 'model variant colour')
      .populate('conductedBy', 'username')
      .sort({ scheduledAt: 1 })
      .skip(skip)
      .limit(limit);
    const total = await TestDrive.countDocuments(filter);
    res.json({ data: testDrives, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export const startTestDrive = async (req, res) => {
  try {
    const testDrive = await TestDrive.findByIdAndUpdate(
      req.params.id,
      { status: 'in_progress', startedAt: new Date(), updatedAt: new Date() },
      { new: true }
    );
    if (!testDrive) return res.status(404).json({ message: 'Test drive not found' });
    res.json({ message: 'Test drive started', data: testDrive });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export const completeTestDrive = async (req, res) => {
  try {
    const { feedback } = req.body;
    const testDrive = await TestDrive.findByIdAndUpdate(
      req.params.id,
      { status: 'completed', completedAt: new Date(), feedback, updatedAt: new Date() },
      { new: true }
    );
    if (!testDrive) return res.status(404).json({ message: 'Test drive not found' });
    res.json({ message: 'Test drive completed', data: testDrive });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};
