const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from public folder
app.use(express.static('public'));

// Start server
app.listen(PORT, () => {
  console.log('Winter OS running on port ' + PORT);
});
