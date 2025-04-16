const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Client, GatewayIntentBits } = require('discord.js');

const app = express();
const port = process.env.PORT || 5000;

// PostgreSQL setup
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Discord client setup
const discordClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]
});

// Discord bot token and channel ID
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;

// Conectar ao Discord apenas se o token estiver disponível
if (DISCORD_TOKEN) {
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

// Create tables
async function createTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contributors (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        date TEXT NOT NULL,
        item TEXT NOT NULL,
        quantity INTEGER NOT NULL
      )
    `);
    console.log('Tabelas criadas com sucesso');
  } catch (err) {
    console.error('Erro ao criar tabelas:', err);
  }
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
app.get('/api/contributors', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM contributors ORDER BY date DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/contributors', async (req, res) => {
  const { name, date, item, quantity } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO contributors (name, date, item, quantity) VALUES ($1, $2, $3, $4) RETURNING id',
      [name, date, item, quantity]
    );
    res.json({ id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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

app.delete('/api/contributors/:id', async (req, res) => {
  const id = req.params.id;
  try {
    await pool.query('DELETE FROM contributors WHERE id = $1', [id]);
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
