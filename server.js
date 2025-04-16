const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const { Client, GatewayIntentBits } = require('discord.js');

const app = express();
const port = 5000;

// Discord client setup
const discordClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]
});

// Discord bot token and channel ID
const DISCORD_TOKEN = process.env.DISCORD_TOKEN || 'YOUR_BOT_TOKEN'; // Use variável de ambiente
const CHANNEL_ID = 'NHZwYaqr'; // ID do canal do Discord

// Conectar ao Discord apenas se o token estiver disponível
if (DISCORD_TOKEN && DISCORD_TOKEN !== 'YOUR_BOT_TOKEN') {
  discordClient.login(DISCORD_TOKEN).catch(error => {
    console.error('Erro ao conectar ao Discord:', error);
  });
} else {
  console.warn('Token do Discord não configurado. Notificações do Discord desativadas.');
}

discordClient.on('ready', () => {
  console.log(`Bot conectado como ${discordClient.user.tag}`);
});

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Database setup
const db = new sqlite3.Database('./cafe.db', (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to the SQLite database');
    createTables();
  }
});

// Create tables
function createTables() {
  db.run(`CREATE TABLE IF NOT EXISTS contributors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    date TEXT NOT NULL,
    item TEXT NOT NULL,
    quantity INTEGER NOT NULL
  )`);
}

// Função para enviar mensagem no Discord
async function sendDiscordMessage(message) {
  if (!discordClient.isReady()) {
    console.warn('Bot do Discord não está conectado. Mensagem não enviada.');
    return;
  }

  try {
    const channel = await discordClient.channels.fetch(CHANNEL_ID);
    if (channel) {
      await channel.send(message);
      console.log('Mensagem enviada com sucesso para o Discord');
    } else {
      console.error('Canal do Discord não encontrado');
    }
  } catch (error) {
    console.error('Erro ao enviar mensagem no Discord:', error);
  }
}

// API Routes
app.get('/api/contributors', (req, res) => {
  db.all('SELECT * FROM contributors ORDER BY date DESC', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/contributors', (req, res) => {
  const { name, date, item, quantity } = req.body;
  db.run(
    'INSERT INTO contributors (name, date, item, quantity) VALUES (?, ?, ?, ?)',
    [name, date, item, quantity],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID });
    }
  );
});

app.post('/api/notify-next', async (req, res) => {
  const { type, currentPerson, nextPerson } = req.body;
  const message = `🔄 **Próximo na lista de ${type === 'cafe' ? 'Café' : 'Filtro'}**\n` +
                 `Atual: ${currentPerson}\n` +
                 `Próximo: ${nextPerson}\n` +
                 `@everyone`;

  try {
    await sendDiscordMessage(message);
    res.json({ success: true, message: 'Notificação enviada com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao enviar notificação' });
  }
});

app.delete('/api/contributors/:id', (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM contributors WHERE id = ?', id, (err) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Deleted successfully' });
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 