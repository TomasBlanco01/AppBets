import { useState, useEffect } from 'react'
import betService from '../services/bets'
import pageService from '../services/pages'
import tipsterService from '../services/tipsters'
import sportService from '../services/sports'
import bankrollService from '../services/bankroll'
import BankrollBar from './BankrollBar'
import BankrollChart from './BankrollChart'
import CreateBet from './CreateBet'
import BetsStats from './BetsStats'
import BetsList from './BetsList'

const BetsView = () => {
  const [bets, setBets] = useState([]);
  const [pages, setPages] = useState([]);
  const [tipsters, setTipsters] = useState([]);
  const [sports, setSports] = useState([]);
  const [bankroll, setBankroll] = useState(0);
  const [bankrollDate, setBankrollDate] = useState(null);
  const [bankrollHistory, setBankrollHistory] = useState([]);

  useEffect(() => {
    betService.getAll()
      .then(response => setBets(response.data))
      .catch(error => console.error('Error fetching bets:', error));
  }, []);

  useEffect(() => {
    pageService.getAll()
      .then(response => setPages(response.data))
      .catch(error => console.error('Error fetching pages:', error));
  }, []);

  useEffect(() => {
    tipsterService.getAll()
      .then(response => setTipsters(response.data))
      .catch(error => console.error('Error fetching tipsters:', error));
  }, []);

  useEffect(() => {
    sportService.getAll()
      .then(response => setSports(response.data))
      .catch(error => console.error('Error fetching sports:', error));
  }, []);

  const refreshBankroll = () => {
    bankrollService.get()
      .then(response => {
        setBankroll(response.data.amount);
        setBankrollDate(response.data.date);
      })
      .catch(error => console.error('Error fetching bankroll:', error));
    bankrollService.getHistory()
      .then(response => setBankrollHistory(response.data))
      .catch(error => console.error('Error fetching bankroll history:', error));
  };

  useEffect(() => {
    refreshBankroll();
  }, []);

  const addBet = (newBet) => {
    betService.create(newBet)
      .then(() => betService.getAll().then(resp => setBets(resp.data)))
      .catch(error => console.error('Error adding bet:', error));
  };

  const updateBet = (betId, data) => {
    betService.update(betId, data)
      .then(() => betService.getAll().then(resp => setBets(resp.data)))
      .catch(error => console.error('Error updating bet:', error));
  };

  const deleteBet = (betId) => {
    betService.remove(betId)
      .then(() => setBets(prev => prev.filter(b => b.id !== betId)))
      .catch(error => console.error('Error deleting bet:', error));
  };

  const addTipster = (newTipster) => {
    tipsterService.create(newTipster)
      .then(() => tipsterService.getAll().then(resp => setTipsters(resp.data)))
      .catch(error => console.error('Error adding tipster:', error));
  };

  const addSport = (newSport) => {
    sportService.create(newSport)
      .then(() => sportService.getAll().then(resp => setSports(resp.data)))
      .catch(error => console.error('Error adding sport:', error));
  };

  const addBankrollEntry = (amount, date) => {
    bankrollService.addEntry(amount, date)
      .then(() => refreshBankroll())
      .catch(error => console.error('Error updating bankroll:', error));
  };

  return (
    <>
      <BankrollBar bankroll={bankroll} bankrollDate={bankrollDate} addBankrollEntry={addBankrollEntry} />
      <BankrollChart history={bankrollHistory} />

      <CreateBet pages={pages} tipsters={tipsters} sports={sports} bankroll={bankroll} addBet={addBet} addTipster={addTipster} addSport={addSport} />
      <BetsStats bets={bets} />
      <BetsList bets={bets} pages={pages} tipsters={tipsters} sports={sports} updateBet={updateBet} deleteBet={deleteBet} />
    </>
  );
};

export default BetsView;
