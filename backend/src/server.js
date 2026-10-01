import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Backend server is running in ${process.env.NODE_ENV || 'development'} mode on http://localhost:${PORT}`);
});
