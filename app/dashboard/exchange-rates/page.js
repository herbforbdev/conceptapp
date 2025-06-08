import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { Card } from '@/components/ui/card';
import { TextInput } from '@/components/ui/text-input';
import { Button } from '@/components/ui/button';
import { collection, query, orderBy, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

export default function ExchangeRatesPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRate, setEditingRate] = useState(null);
  const [newRate, setNewRate] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    rate: '',
    notes: ''
  });

  // Fetch existing rates
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const ratesRef = collection(db, 'exchangeRates');
        const q = query(ratesRef, orderBy('year', 'desc'), orderBy('month', 'desc'));
        const snapshot = await getDocs(q);
        const ratesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setRates(ratesData);
      } catch (error) {
        console.error('Error fetching rates:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRates();
  }, []);

  // Handle rate update
  const handleUpdateRate = async (rateId, newValue) => {
    try {
      const rateRef = doc(db, 'exchangeRates', rateId);
      await setDoc(rateRef, {
        rate: Number(newValue),
        lastUpdated: serverTimestamp(),
        updatedBy: user.uid
      }, { merge: true });
      
      // Update local state
      setRates(prev => prev.map(rate => 
        rate.id === rateId 
          ? { ...rate, rate: Number(newValue), lastUpdated: new Date() }
          : rate
      ));
    } catch (error) {
      console.error('Error updating rate:', error);
    }
  };

  // Handle new rate submission
  const handleAddRate = async (e) => {
    e.preventDefault();
    try {
      const rateId = `${newRate.year}-${String(newRate.month).padStart(2, '0')}`;
      const rateRef = doc(db, 'exchangeRates', rateId);
      
      await setDoc(rateRef, {
        year: newRate.year,
        month: newRate.month,
        rate: Number(newRate.rate),
        lastUpdated: serverTimestamp(),
        updatedBy: user.uid,
        notes: newRate.notes
      });

      // Update local state
      setRates(prev => [{
        id: rateId,
        year: newRate.year,
        month: newRate.month,
        rate: Number(newRate.rate),
        lastUpdated: new Date(),
        notes: newRate.notes
      }, ...prev]);

      // Reset form
      setNewRate({
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        rate: '',
        notes: ''
      });
    } catch (error) {
      console.error('Error adding rate:', error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{t('Exchange Rates')}</h1>
        
        {/* Add New Rate Form */}
        <Card className="mb-8 p-6">
          <h2 className="text-lg font-semibold mb-4">{t('Add New Rate')}</h2>
          <form onSubmit={handleAddRate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('Year')}
                </label>
                <TextInput
                  type="number"
                  value={newRate.year}
                  onChange={(e) => setNewRate(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                  className="w-full"
                  min={2020}
                  max={2100}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('Month')}
                </label>
                <TextInput
                  type="number"
                  value={newRate.month}
                  onChange={(e) => setNewRate(prev => ({ ...prev, month: parseInt(e.target.value) }))}
                  className="w-full"
                  min={1}
                  max={12}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('Rate')}
                </label>
                <TextInput
                  type="number"
                  value={newRate.rate}
                  onChange={(e) => setNewRate(prev => ({ ...prev, rate: e.target.value }))}
                  className="w-full"
                  step="0.01"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('Notes')}
                </label>
                <TextInput
                  type="text"
                  value={newRate.notes}
                  onChange={(e) => setNewRate(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full"
                />
              </div>
            </div>
            <Button type="submit" className="bg-blue-600 text-white">
              {t('Add Rate')}
            </Button>
          </form>
        </Card>

        {/* Rates Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-900">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 font-semibold">{t('Year')}</th>
                  <th className="px-6 py-3 font-semibold">{t('Month')}</th>
                  <th className="px-6 py-3 font-semibold text-right">{t('Rate')}</th>
                  <th className="px-6 py-3 font-semibold">{t('Last Updated')}</th>
                  <th className="px-6 py-3 font-semibold">{t('Notes')}</th>
                  <th className="px-6 py-3 font-semibold text-center">{t('Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {rates.map((rate) => (
                  <tr key={rate.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4">{rate.year}</td>
                    <td className="px-6 py-4">{new Date(2000, rate.month - 1).toLocaleString('default', { month: 'long' })}</td>
                    <td className="px-6 py-4 text-right font-mono">
                      {editingRate === rate.id ? (
                        <TextInput
                          type="number"
                          value={rate.rate}
                          onChange={(e) => handleUpdateRate(rate.id, e.target.value)}
                          className="w-24 text-right"
                          step="0.01"
                        />
                      ) : (
                        rate.rate.toLocaleString('en-US', { minimumFractionDigits: 2 })
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {rate.lastUpdated?.toDate?.().toLocaleDateString() || 'N/A'}
                    </td>
                    <td className="px-6 py-4">{rate.notes || '-'}</td>
                    <td className="px-6 py-4 text-center">
                      <Button
                        onClick={() => setEditingRate(editingRate === rate.id ? null : rate.id)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {editingRate === rate.id ? t('Save') : t('Edit')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
} 