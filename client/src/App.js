import React, {useEffect, useState} from 'react';
import './App.css';

function App() {
  const [contributors, setContributors] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    date: new Date().toISOString().split('T')[0],
    item: 'cafe',
    quantity: 1,
  });

  const [stats, setStats] = useState({
    cafe: {total: 0, thisMonth: 0},
    filtro: {total: 0, thisMonth: 0},
  });

  const [showStats, setShowStats] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const initialLists = {
    cafe: [
      {name: 'André', current: true},
      {name: 'José', current: false},
      {name: 'Léo', current: false},
      {name: 'Carlos', current: false},
      {name: 'Kauan', current: false},
      {name: 'Mateus', current: false},
      {name: 'Henrique', current: false},
      {name: 'João', current: false},
    ],
    filtro: [
      {name: 'André', current: false},
      {name: 'José', current: false},
      {name: 'Léo', current: false},
      {name: 'Carlos', current: false},
      {name: 'Kauan', current: false},
      {name: 'Henrique', current: true},
      {name: 'Mateus', current: false},
      {name: 'João', current: false},
    ],
  };

  const [lists, setLists] = useState(initialLists);

  useEffect(() => {
    fetchContributors();
    calculateStats();
  }, [contributors]);

  const fetchContributors = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/contributors`,
      );
      const data = await response.json();
      setContributors(data);
    } catch (error) {
      console.error('Error fetching contributors:', error);
    }
  };

  const calculateStats = () => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const newStats = {
      cafe: {total: 0, thisMonth: 0},
      filtro: {total: 0, thisMonth: 0},
    };

    contributors.forEach(contributor => {
      const date = new Date(contributor.date);
      if (contributor.item === 'cafe') {
        newStats.cafe.total += contributor.quantity;
        if (date.getMonth() === thisMonth && date.getFullYear() === thisYear) {
          newStats.cafe.thisMonth += contributor.quantity;
        }
      } else {
        newStats.filtro.total += contributor.quantity;
        if (date.getMonth() === thisMonth && date.getFullYear() === thisYear) {
          newStats.filtro.thisMonth += contributor.quantity;
        }
      }
    });

    setStats(newStats);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/contributors`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        },
      );
      if (response.ok) {
        fetchContributors();
        setFormData({
          name: '',
          date: new Date().toISOString().split('T')[0],
          item: 'cafe',
          quantity: 1,
        });
      }
    } catch (error) {
      console.error('Error submitting contribution:', error);
    }
    setShowForm(false);
  };

  const handleDelete = async id => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/contributors/${id}`,
        {
          method: 'DELETE',
        },
      );
      if (response.ok) {
        fetchContributors();
      }
    } catch (error) {
      console.error('Error deleting contribution:', error);
    }
  };

  const moveNext = async type => {
    const currentList = [...lists[type]];
    const currentIndex = currentList.findIndex(person => person.current);
    const nextIndex = (currentIndex + 1) % currentList.length;

    currentList[currentIndex].current = false;
    currentList[nextIndex].current = true;

    setLists(prev => ({
      ...prev,
      [type]: currentList,
    }));

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/notify-next`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type,
            currentPerson: currentList[currentIndex].name,
            nextPerson: currentList[nextIndex].name,
          }),
        },
      );
      if (!response.ok) {
        console.error('Error sending notification');
      }
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  const calculateContributions = (name, type) => {
    return contributors.filter(
      contributor => contributor.name === name && contributor.item === type,
    ).length;
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>☕ Café Abase</h1>
        <p>Gerencie as contribuições de café e filtros</p>
      </header>

      <main className="main-content">
        <div className="lists-container">
          <section className="list-section cafe-list">
            <h2>Lista do Café</h2>
            <div className="list-content">
              {lists.cafe.map((person, index) => (
                <div
                  key={index}
                  className={`list-item ${person.current ? 'current' : ''}`}
                >
                  <div className="person-info">
                    <span className="person-name">{person.name}</span>
                    <span className="contribution-count">
                      {calculateContributions(person.name, 'cafe')}
                    </span>
                  </div>
                  {person.current && (
                    <span className="current-marker">👈 Próximo </span>
                  )}
                </div>
              ))}
            </div>
            <button className="next-button" onClick={() => moveNext('cafe')}>
              <i className="fas fa-arrow-right"></i> Próximo
            </button>
          </section>

          <section className="list-section filter-list">
            <h2>Lista do Filtro</h2>
            <div className="list-content">
              {lists.filtro.map((person, index) => (
                <div
                  key={index}
                  className={`list-item ${person.current ? 'current' : ''}`}
                >
                  <div className="person-info">
                    <span className="person-name">{person.name}</span>
                    <span className="contribution-count">
                      {calculateContributions(person.name, 'filtro')}
                    </span>
                  </div>
                  {person.current && (
                    <span className="current-marker">👈 Próximo</span>
                  )}
                </div>
              ))}
            </div>
            <button className="next-button" onClick={() => moveNext('filtro')}>
              <i className="fas fa-arrow-right"></i> Próximo
            </button>
          </section>

          <div className="buttons">
            <button
              className="stats-button"
              onClick={() => setShowStats(!showStats)}
            >
              <i className="fas fa-chart-bar"></i> Estatísticas
            </button>
          </div>

          {showStats && (
            <div className="stats-container">
              <div className="stats-header">
                <h2>Estatísticas</h2>
                <button
                  className="close-button"
                  onClick={() => setShowStats(false)}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="stats-grid">
                <div className="stat-card cafe-stats">
                  <h3>Café</h3>
                  <p>{stats.cafe.total}</p>
                  <span className="subtitle">Total de Contribuições</span>
                </div>
                <div className="stat-card filtro-stats">
                  <h3>Filtro</h3>
                  <p>{stats.filtro.total}</p>
                  <span className="subtitle">Total de Contribuições</span>
                </div>
                <div className="stat-card monthly-stats">
                  <h3>Café Este Mês</h3>
                  <p>{stats.cafe.thisMonth}</p>
                  <span className="subtitle">Contribuições Mensais</span>
                </div>
                <div className="stat-card total-stats">
                  <h3>Filtro Este Mês</h3>
                  <p>{stats.filtro.thisMonth}</p>
                  <span className="subtitle">Contribuições Mensais</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <section className="history-section">
          <h2>Histórico de Contribuições</h2>

          <form onSubmit={handleSubmit} className="contribution-form">
            <div className="form-group">
              <label>Usuário:</label>
              <select
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                required
                className="form-select"
              >
                <option value="">Selecione um usuário</option>
                {[
                  ...new Set(
                    [...lists.cafe, ...lists.filtro].map(person => person.name),
                  ),
                ].map(name => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Data:</label>
              <input
                type="date"
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label>Item:</label>
              <select
                value={formData.item}
                onChange={e => setFormData({...formData, item: e.target.value})}
                required
                className="form-select"
              >
                <option value="cafe">Café</option>
                <option value="filtro">Filtro</option>
              </select>
            </div>
            <div className="form-group">
              <label>Quantidade:</label>
              <input
                type="number"
                value={formData.quantity}
                onChange={e =>
                  setFormData({...formData, quantity: parseInt(e.target.value)})
                }
                min="1"
                required
              />
            </div>
            <button type="submit" className="submit-button">
              Adicionar ao Histórico
            </button>
          </form>

          <div className="contributions-list">
            {contributors.map(contributor => (
              <div key={contributor.id} className="contribution-card">
                <div className="contribution-info">
                  <h3>{contributor.name}</h3>
                  <p>Data: {new Date(contributor.date).toLocaleDateString()}</p>
                  <p>Item: {contributor.item === 'cafe' ? 'Café' : 'Filtro'}</p>
                  <p>Quantidade: {contributor.quantity}</p>
                </div>
                <button
                  onClick={() => handleDelete(contributor.id)}
                  className="delete-button"
                >
                  <i className="fas fa-trash-alt"></i>
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
