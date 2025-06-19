import React, { useState, useEffect } from 'react';
import { HiBell, HiTrash } from 'react-icons/hi';
import { useRouter } from 'next/navigation';
import { firestore } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';

const Notifications = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(firestore, 'notifications'), 
      where('recipientId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedNotifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setNotifications(fetchedNotifications);
      setUnreadCount(fetchedNotifications.filter(n => !n.read).length);
    });

    return () => unsubscribe();
  }, [user]);

  const handleToggle = async () => {
    if (!isOpen) {
      // Mark all as read when opening the dropdown
      const unread = notifications.filter(n => !n.read);
      for (const notif of unread) {
        const notifRef = doc(firestore, 'notifications', notif.id);
        await updateDoc(notifRef, { read: true });
      }
    }
    setIsOpen(!isOpen);
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation(); // Prevent dropdown from closing
    await deleteDoc(doc(firestore, 'notifications', id));
  };

  const handleNavigate = (link) => {
    router.push(link);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button 
        onClick={handleToggle} 
        className="relative p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
      >
        <HiBell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex items-center justify-center h-5 w-5 bg-red-500 text-white text-xs rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl overflow-hidden z-50">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800">{String(t('notifications.title') || 'Notifications')}</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map(notif => (
                <div 
                  key={notif.id} 
                  onClick={() => handleNavigate(notif.link)}
                  className="p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-gray-800">{notif.title}</p>
                      <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        {(() => {
                          try {
                            return String(notif.createdAt?.toDate().toLocaleString() || '');
                          } catch (error) {
                            return 'Invalid date';
                          }
                        })()}
                      </p>
                    </div>
                    <button 
                      onClick={(e) => handleDelete(notif.id, e)}
                      className="p-1 text-gray-400 hover:text-red-500 rounded-full"
                    >
                      <HiTrash className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-gray-500">
                {String(t('notifications.noNotifications') || 'No notifications')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications; 