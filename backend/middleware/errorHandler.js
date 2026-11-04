export default function errorHandler(error, _request, response, _next) {
  if (error.code === 11000) {
    return response.status(409).json({ message: 'An account or product with that identifier already exists.' });
  }
  if (error.name === 'ValidationError') {
    return response.status(400).json({ message: error.message });
  }
  const status = Number.isInteger(error.status) ? error.status : 500;
  if (status >= 500) console.error(error);
  if (Number.isInteger(error.retryAfter)) {
    response.set('Retry-After', String(error.retryAfter));
  }
  response.status(status).json({
    message: status >= 500 ? 'The server could not complete the request.' : error.message,
    ...(Number.isInteger(error.retryAfter) && { retryAfter: error.retryAfter }),
  });
}
