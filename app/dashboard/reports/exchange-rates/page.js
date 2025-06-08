"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { Card, Button, TextInput, Label, Select, Alert, Table, Badge } from 'flowbite-react';
import { HiPlus, HiPencil, HiTrash, HiCalendar, HiTrendingUp } from 'react-icons/hi';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function ExchangeRatesPage() {
  const { t } = useLanguage();
  const router = useRouter();
  
  const [rates, setRates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRate, setEditingRate] = useState(null);
  const [formData, setFormData] = useState({
    year: new Date().getFullYear(),
    month: '',
    rate: '',
  });
  const [message, setMessage] = useState(null);

  const months = [
    { value: 1, label: 'Janvier' },
    { value: 2, label: 'Février' },
    { value: 3, label: 'Mars' },
    { value: 4, label: 'Avril' },
    { value: 5, label: 'Mai' },
    { value: 6, label: 'Juin' },
    { value: 7, label: 'Juillet' },
    { value: 8, label: 'Août' },
    { value: 9, label: 'Septembre' },
    { value: 10, label: 'Octobre' },
    { value: 11, label: 'Novembre' },
    { value: 12, label: 'Décembre' },
  ];

  useEffect(() => {
    fetchRates();
  }, []);

  const fetchRates = async () => {
    try {
      setIsLoading(true);
      const q = query(
        collection(db, 'exchangeRates'),
        orderBy('year', 'desc'),
        orderBy('month', 'desc')
      );
      const snapshot = await getDocs(q);
      const ratesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRates(ratesData);
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      setMessage({ type: 'error', text: 'Erreur lors du chargement des taux de change' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.month || !formData.rate) {
      setMessage({ type: 'error', text: 'Veuillez remplir tous les champs requis' });
      return;
    }

    try {
      const rateData = {
        year: parseInt(formData.year),
        month: parseInt(formData.month),
        rate: parseFloat(formData.rate),
        updatedAt: new Date(),
      };

      if (editingRate) {
        await updateDoc(doc(db, 'exchangeRates', editingRate.id), rateData);
        setMessage({ type: 'success', text: 'Taux de change mis à jour avec succès' });
      } else {
        rateData.createdAt = new Date();
        await addDoc(collection(db, 'exchangeRates'), rateData);
        setMessage({ type: 'success', text: 'Nouveau taux de change ajouté avec succès' });
      }

      setIsModalOpen(false);
      setEditingRate(null);
      setFormData({ year: new Date().getFullYear(), month: '', rate: '' });
      fetchRates();
    } catch (error) {
      console.error('Error saving exchange rate:', error);
      setMessage({ type: 'error', text: 'Erreur lors de la sauvegarde' });
    }
  };

  const handleEdit = (rate) => {
    setEditingRate(rate);
    setFormData({
      year: rate.year,
      month: rate.month,
      rate: rate.rate,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (rateId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce taux de change ?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'exchangeRates', rateId));
      setMessage({ type: 'success', text: 'Taux de change supprimé avec succès' });
      fetchRates();
    } catch (error) {
      console.error('Error deleting exchange rate:', error);
      setMessage({ type: 'error', text: 'Erreur lors de la suppression' });
    }
  };

  const getCurrentRate = () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    return rates.find(rate => rate.year === currentYear && rate.month === currentMonth);
  };

  const currentRate = getCurrentRate();

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Taux de Change</h1>
          <p className="text-gray-600">Gestion des taux de change CDF/USD</p>
        </div>
        <Button
          onClick={() => {
            setIsModalOpen(true);
            setEditingRate(null);
            setFormData({ year: new Date().getFullYear(), month: '', rate: '' });
          }}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <HiPlus className="h-4 w-4 mr-2" />
          Ajouter un taux
        </Button>
      </div>

      {message && (
        <Alert color={message.type === 'success' ? 'success' : 'failure'} className="mb-4">
          {message.text}
        </Alert>
      )}

      {/* Current Rate Card */}
      {currentRate && (
        <Card className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-green-100 rounded-full">
                <HiTrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Taux de change actuel</h3>
                <p className="text-2xl font-bold text-green-600">{currentRate.rate.toLocaleString()} CDF/USD</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">
                {months.find(m => m.value === currentRate.month)?.label} {currentRate.year}
              </p>
              <Badge color="success">Actuel</Badge>
            </div>
          </div>
        </Card>
      )}

      {/* Rates Table */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Historique des taux</h3>
          
          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Chargement...</p>
            </div>
          ) : rates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <HiCalendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Aucun taux de change enregistré</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <Table.Head>
                  <Table.HeadCell>Année</Table.HeadCell>
                  <Table.HeadCell>Mois</Table.HeadCell>
                  <Table.HeadCell>Taux (CDF/USD)</Table.HeadCell>
                  <Table.HeadCell>Mis à jour</Table.HeadCell>
                  <Table.HeadCell>Actions</Table.HeadCell>
                </Table.Head>
                <Table.Body>
                  {rates.map((rate) => (
                    <Table.Row key={rate.id}>
                      <Table.Cell className="font-medium">{rate.year}</Table.Cell>
                      <Table.Cell>
                        {months.find(m => m.value === rate.month)?.label}
                      </Table.Cell>
                      <Table.Cell className="font-bold text-green-600">
                        {rate.rate.toLocaleString()}
                      </Table.Cell>
                      <Table.Cell>
                        {rate.updatedAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                      </Table.Cell>
                      <Table.Cell>
                        <div className="flex space-x-2">
                          <Button
                            size="xs"
                            color="warning"
                            onClick={() => handleEdit(rate)}
                          >
                            <HiPencil className="h-3 w-3" />
                          </Button>
                          <Button
                            size="xs"
                            color="failure"
                            onClick={() => handleDelete(rate.id)}
                          >
                            <HiTrash className="h-3 w-3" />
                          </Button>
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            </div>
          )}
        </div>
      </Card>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingRate ? 'Modifier le taux' : 'Ajouter un nouveau taux'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="year">Année</Label>
                <TextInput
                  id="year"
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="month">Mois</Label>
                <Select
                  id="month"
                  value={formData.month}
                  onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                  required
                >
                  <option value="">Sélectionner un mois</option>
                  {months.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label htmlFor="rate">Taux (CDF/USD)</Label>
                <TextInput
                  id="rate"
                  type="number"
                  step="0.01"
                  value={formData.rate}
                  onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                  placeholder="Ex: 2900"
                  required
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  color="gray"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingRate(null);
                  }}
                >
                  Annuler
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  {editingRate ? 'Mettre à jour' : 'Ajouter'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 