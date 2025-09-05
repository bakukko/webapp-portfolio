const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.send(`
    <h1>Le mie Webapp</h1>
    <ul>
      <li><a href="https://app1.rossettimauro.work">App 1</a></li>
      <li><a href="https://app2.rossettimauro.work">App 2</a></li>
      <li><a href="https://n8n.rossettimauro.work">N8N Automazioni</a></li>
    </ul>
  `);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(\`Dashboard running on port \${PORT}\`);
});
