import { useState, useEffect, useMemo } from 'react';
import ioService from '../services/io';
import IODashboard from './IODashboard';
import IOMonthlyChart from './IOMonthlyChart';
import IOBudget from './IOBudget';
import CreateIO from './CreateIO';
import IOList from './IOList';
import { Container, Divider } from '@mui/material';

const IOView = () => {
  const [movements, setMovements] = useState([]);
  const [budgets, setBudgets] = useState([]);

  useEffect(() => {
    ioService.getAll()
      .then(response => setMovements(response.data))
      .catch(error => console.error('Error fetching I/O movements:', error));

    ioService.getBudgets()
      .then(response => setBudgets(response.data))
      .catch(error => console.error('Error fetching I/O budgets:', error));
  }, []);

  const sortedMovements = useMemo(() => {
    return [...movements].sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return b.id - a.id;
    });
  }, [movements]);

  const addMovement = (newMovement) => {
    ioService.create(newMovement)
      .then(() => ioService.getAll().then(resp => setMovements(resp.data)))
      .catch(error => console.error('Error adding I/O movement:', error));
  };

  const updateMovement = (movementId, data) => {
    ioService.update(movementId, data)
      .then(() => ioService.getAll().then(resp => setMovements(resp.data)))
      .catch(error => console.error('Error updating I/O movement:', error));
  };

  const deleteMovement = (movementId) => {
    ioService.remove(movementId)
      .then(() => setMovements(prev => prev.filter(m => m.id !== movementId)))
      .catch(error => console.error('Error deleting I/O movement:', error));
  };

  const saveBudgets = async (newBudgets) => {
    const response = await ioService.saveBudgets(newBudgets);
    setBudgets(response.data);
  };

  return (
    <>
      <IODashboard movements={sortedMovements} />
      <IOMonthlyChart movements={sortedMovements} />
      <IOBudget movements={sortedMovements} budgets={budgets} onSave={saveBudgets} />
      <CreateIO addMovement={addMovement} />
      <Container maxWidth="xl">
        <Divider sx={{ borderColor: '#2a3a4a', my: 3 }} />
      </Container>
      <IOList
        movements={sortedMovements}
        updateMovement={updateMovement}
        deleteMovement={deleteMovement}
      />
    </>
  );
};

export default IOView;
