import { collection, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { firestore } from './firebase';

export class ExchangeRateService {
  static async getRateForDate(date) {
    try {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const rateId = `${year}-${String(month).padStart(2, '0')}`;
      
      const rateRef = doc(firestore, 'exchangeRates', rateId);
      const rateDoc = await getDoc(rateRef);
      
      if (rateDoc.exists()) {
        return rateDoc.data().rate;
      }
      
      // If no rate found for the current month, get the most recent rate
      const ratesRef = collection(firestore, 'exchangeRates');
      const q = query(
        ratesRef,
        orderBy('year', 'desc'),
        orderBy('month', 'desc')
      );
      
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return snapshot.docs[0].data().rate;
      }
      
      // Default rate if no rates are found
      return 2500;
    } catch (error) {
      console.error('Error getting exchange rate:', error);
      return 2500;
    }
  }

  static async getMonthlyRate(year, month) {
    try {
      const rateId = `${year}-${String(month).padStart(2, '0')}`;
      const rateRef = doc(firestore, 'exchangeRates', rateId);
      const rateDoc = await getDoc(rateRef);
      
      if (rateDoc.exists()) {
        return rateDoc.data().rate;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting monthly rate:', error);
      return null;
    }
  }

  static async getRatesForYear(year) {
    try {
      const ratesRef = collection(firestore, 'exchangeRates');
      const q = query(
        ratesRef,
        where('year', '==', year),
        orderBy('month', 'asc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting rates for year:', error);
      return [];
    }
  }
} 