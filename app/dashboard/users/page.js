<div>
  <button
    onClick={() => handleApproveUser(user.id)}
    className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
  >
    Approve
  </button>

  <button
    onClick={handleSaveRole}
    className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
  >
    Save
  </button>
</div>

const handleApproveUser = async (userId) => {
  try {
    const userRef = doc(firestore, 'users', userId);
    await updateDoc(userRef, {
      status: 'active',
      approved: true
    });
    // Optionally, refresh the user list or show a success message
  } catch (error) {
    console.error('Error approving user:', error);
  }
};

const handleDeleteUser = async (userId, userRole) => {
  if (userRole === 'admin') {
    alert('Admin users cannot be deleted.');
    return;
  }
  try {
    const userRef = doc(firestore, 'users', userId);
    await deleteDoc(userRef);
    // Optionally, refresh the user list or show a success message
  } catch (error) {
    console.error('Error deleting user:', error);
  }
};

const handleSaveRole = async (userId, newRole) => {
  try {
    const userRef = doc(firestore, 'users', userId);
    await updateDoc(userRef, {
      role: newRole
    });
    // Optionally, refresh the user list or show a success message
  } catch (error) {
    console.error('Error updating user role:', error);
  }
}; 