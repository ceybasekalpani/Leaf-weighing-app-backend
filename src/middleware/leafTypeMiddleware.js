const leafTypeMiddleware = (req, res, next) => {
  // Get leaf type from header, default to 'Normal'
  const leafType = req.headers['leaf-type'] || 'Normal';
  
  // Validate leaf type
  if (!['Normal', 'Super'].includes(leafType)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid leaf type. Must be "Normal" or "Super"'
    });
  }
  
  // Attach to request for use in controllers
  req.leafType = leafType;
  next();
};

module.exports = leafTypeMiddleware;