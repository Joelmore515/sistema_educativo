const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);

  if (!result.success) {
    return res.status(400).json({
      message: 'Datos inválidos',
      errors: result.error.issues.map((issue) => ({
        field: issue.path.join('.') || source,
        message: issue.message
      }))
    });
  }

  req[source] = result.data;
  next();
};

module.exports = { validate };
