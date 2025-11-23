import React, { useState, useEffect } from 'react';
import posService from '../services/posService';

function CheckoutPage() {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');

  // Fetch the cart contents on mount
  useEffect(() => {
    const fetchCart = async () => {
      try {
        const cartData = await posService.getCart();
        setCart(cartData);
      } catch (err) {
        setError('Failed to load cart.');
      }
    };
    fetchCart();
  }, []);

  const handleCheckout = async () => {
    setError(null);
    setLoading(true);

    // Prepare data for the checkout API call
    const checkoutData = {
      payment_method: paymentMethod,
      // Add other required data like 'amount_paid', 'customer_id', etc.
    };

    try {
      // 🚨 The checkout API call
      const transaction = await posService.checkout(checkoutData);
      
      // Success: Handle successful transaction (e.g., redirect to receipt)
      alert(`Checkout Successful! Transaction ID: ${transaction.id}`);
      setCart(null); // Clear cart after success

    } catch (err) {
      console.error('Checkout failed:', err.response || err);
      
      // ⚠️ Error Handling logic for the "Server error" ⚠️
      let errorMessage = 'Checkout failed. Please check your data.';

      if (err.response) {
        // Axios error response object is available (e.g., status 400, 500)
        const status = err.response.status;

        if (status === 500) {
          // This matches the "Server error. Please try again later." from your image
          errorMessage = 'Server error. The transaction could not be processed. Please try again later.';
        } else if (status === 400) {
          // Bad Request/Validation Error
          errorMessage = err.response.data.message || 'Validation failed. Check payment details.';
        } else {
          errorMessage = `Checkout failed with status ${status}.`;
        }
      } else if (err.request) {
        // Request made, but no response (Network issue)
        errorMessage = 'Network error. Could not connect to the server.';
      }

      setError(errorMessage);

    } finally {
      setLoading(false);
    }
  };

  if (error && !cart) return <div style={{color: 'red'}}>Error: {error}</div>;
  if (!cart) return <div>Loading cart...</div>;

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc' }}>
      <h1>Checkout</h1>
      
      {/* Display Cart Items here (omitted for brevity) */}
      <p>Cart (1) - Item: **RosasNaPula**</p>
      
      <div style={{ marginTop: '20px' }}>
        <label>
          Payment Method:
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} disabled={loading}>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
          </select>
        </label>
      </div>

      <button 
        onClick={handleCheckout} 
        disabled={loading || cart.items?.length === 0}
        style={{ marginTop: '20px', padding: '10px 20px', backgroundColor: loading ? '#ccc' : 'green', color: 'white' }}
      >
        {loading ? 'Processing...' : 'Complete Checkout'}
      </button>

      {error && (
        <p style={{ color: 'red', marginTop: '15px', fontWeight: 'bold' }}>
          {error}
        </p>
      )}
    </div>
  );
}

export default CheckoutPage;