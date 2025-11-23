import api from './api'; 

// The base URL for user management (list/create/admin detail)
const USER_URL = 'auth/users/'; 
// The URL for the current user (self-edit)
const ME_URL = 'auth/me/'; 

const userService = {
    
    // READ: Get all users
    getAllUsers: () => {
        return api.get(USER_URL);
    },

    // CREATE: Create a new user
    createUser: (userData) => {
        return api.post(USER_URL, userData);
    },

    // READ: Get user details (Handles both specific ID and 'me')
    getUserDetail: (userId) => {
        if (userId === 'me') {
            return api.get(ME_URL); 
        }
        return api.get(`${USER_URL}${userId}/`); 
    },

    // UPDATE: Update a user (Handles both specific ID and 'me')
    updateUser: (userId, userData) => {
        if (userId === 'me') {
            return api.patch(ME_URL, userData); 
        }
        return api.patch(`${USER_URL}${userId}/`, userData);
    },

    // --- FIXES BELOW ---

    // DEACTIVATE: Updates the user status to inactive (Soft Delete)
    deactivateUser: (userId) => {
        // We use PATCH to only update the specific field 'is_active'
        return api.patch(`${USER_URL}${userId}/`, { is_active: false });
    },

    // DELETE: Permanently removes the user from database (Hard Delete)
    deleteUser: (userId) => {
        // This was missing before!
        return api.delete(`${USER_URL}${userId}/`);
    }
};

export default userService;