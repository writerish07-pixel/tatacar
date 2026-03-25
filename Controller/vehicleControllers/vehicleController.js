import Vehicle from '../../models/Vehicle.js';

export const createVehicle = async (req, res) => {
  try {
    const vehicle = new Vehicle(req.body);
    await vehicle.save();
    res.status(201).json({ message: 'Vehicle added to stock', data: vehicle });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'VIN already exists' });
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export const getVehicles = async (req, res) => {
  try {
    const { page, limit, skip } = req.pagination;
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.model) filter.model = req.query.model;
    if (req.query.fuel_type) filter.fuelType = req.query.fuel_type;
    const vehicles = await Vehicle.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const total = await Vehicle.countDocuments(filter);
    res.json({ data: vehicles, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export const getVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    res.json({ data: vehicle });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export const updateVehicleStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const vehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      { status, updatedAt: new Date() },
      { new: true }
    );
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    res.json({ message: 'Vehicle status updated', data: vehicle });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export const getAvailableVehicles = async (req, res) => {
  try {
    const filter = { status: 'in_yard' };
    if (req.query.model) filter.model = req.query.model;
    if (req.query.variant) filter.variant = req.query.variant;
    if (req.query.colour) filter.colour = req.query.colour;
    const vehicles = await Vehicle.find(filter).sort({ createdAt: -1 });
    res.json({ data: vehicles });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};
