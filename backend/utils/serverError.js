// One place that turns a thrown error into an HTTP response.
// The real error is logged server-side; clients never see internals.
const serverError = (res, error) => {
  if (error.publicMessage) {
    return res.status(error.status || 500).json({ message: error.publicMessage });
  }
  // A malformed ObjectId in the URL is just a resource that does not exist.
  if (error.name === 'CastError') {
    return res.status(404).json({ message: 'Not found' });
  }
  if (error.name === 'ValidationError') {
    return res.status(400).json({ message: 'Invalid data provided' });
  }
  // Unique-index race: two signups with the same email at the same moment.
  if (error.code === 11000) {
    return res.status(400).json({ message: 'That email is already in use' });
  }
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'File is too large. Maximum size is 5MB.' });
  }
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Invalid request body' });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Request is too large' });
  }

  console.error(error);
  return res.status(500).json({ message: 'Something went wrong on our side. Please try again.' });
};

module.exports = serverError;
